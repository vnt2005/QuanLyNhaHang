using System.Data.Common;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.AiAssistant;
using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.AI;

public sealed partial class GeminiAiAssistantService : IAiAssistantService
{
    private const int MaxMessageLength = 1200;
    private static readonly TimeSpan ToolConversationTimeout = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan ProviderRequestTimeout = TimeSpan.FromSeconds(20);

    private readonly HttpClient _httpClient;
    private readonly IApplicationDbContext _dbContext;
    private readonly AiAssistantDataProvider _dataProvider;
    private readonly GeminiOptions _options;
    private readonly ILogger<GeminiAiAssistantService> _logger;

    public GeminiAiAssistantService(
        HttpClient httpClient,
        IApplicationDbContext dbContext,
        IPaymentGateway paymentGateway,
        IPaymentChannelReadiness paymentChannelReadiness,
        IOptions<GeminiOptions> options,
        ILogger<GeminiAiAssistantService> logger)
    {
        _httpClient = httpClient;
        _dbContext = dbContext;
        _dataProvider = new AiAssistantDataProvider(
            dbContext,
            paymentGateway,
            paymentChannelReadiness);
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AiAssistantPublicConfigDto> GetPublicConfigAsync(
        CancellationToken cancellationToken = default)
    {
        var setting = await GetActiveSettingAsync(cancellationToken);
        if (setting is null)
        {
            return new AiAssistantPublicConfigDto
            {
                Enabled = false,
                ProviderConfigured = IsProviderConfigured,
                WelcomeMessage = "Trợ lý AI hiện chưa sẵn sàng."
            };
        }

        return new AiAssistantPublicConfigDto
        {
            Enabled = setting.AiAssistantEnabled && IsProviderConfigured,
            ProviderConfigured = IsProviderConfigured,
            WelcomeMessage = setting.AiAssistantWelcomeMessage
                ?? "Xin chào! Tôi là trợ lý AI của nhà hàng.",
            SuggestedQuestions = ParseSuggestedQuestions(
                setting.AiAssistantSuggestedQuestions)
        };
    }

    public async Task<AiAssistantAdminConfigDto> GetAdminConfigAsync(
        CancellationToken cancellationToken = default)
    {
        var setting = await RequireActiveSettingAsync(cancellationToken);
        return MapAdminConfig(setting);
    }

    public async Task<AiAssistantAdminConfigDto> UpdateConfigAsync(
        UpdateAiAssistantConfigDto input,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);

        var model = input.Model?.Trim() ?? string.Empty;
        if (model.Length is < 2 or > 100)
            throw new ArgumentException("Tên model AI phải có từ 2 đến 100 ký tự.");
        if (!model.StartsWith("gemini-", StringComparison.OrdinalIgnoreCase)
            || !model.All(character => char.IsAsciiLetterOrDigit(character)
                || character is '-' or '_' or '.'))
        {
            throw new ArgumentException(
                "Model phải là model Gemini hợp lệ, ví dụ gemini-3.7-flash.");
        }

        if ((input.WelcomeMessage?.Length ?? 0) > 1000)
            throw new ArgumentException("Lời chào AI tối đa 1000 ký tự.");
        if ((input.SystemPrompt?.Length ?? 0) > 8000)
            throw new ArgumentException("System prompt AI tối đa 8000 ký tự.");
        if ((input.KnowledgeBase?.Length ?? 0) > 30000)
            throw new ArgumentException("Kho kiến thức AI tối đa 30000 ký tự.");

        var suggestedQuestions = NormalizeSuggestedQuestions(input.SuggestedQuestions);
        var setting = await RequireActiveSettingAsync(cancellationToken);

        setting.UpdateAiAssistant(
            input.Enabled,
            model,
            input.WelcomeMessage,
            input.SystemPrompt,
            input.KnowledgeBase,
            suggestedQuestions,
            input.MaxOutputTokens);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapAdminConfig(setting);
    }

    public async Task<AiAssistantChatResponseDto> ChatAsync(
        AiAssistantChatRequestDto request,
        AiAssistantCallerContext callerContext,
        CancellationToken cancellationToken = default)
    {
        using var timeoutCts = CreateRequestTimeout(cancellationToken);

        try
        {
            var setting = await ValidateChatAsync(
                request,
                requirePublicEnabled: true,
                cancellationToken: timeoutCts.Token,
                requireProviderConfigured: false);
            var model = ResolveModel(setting.AiAssistantModel);
            var routes = AiAssistantBusinessIntentCatalog.ResolveCustomer(
                request.Message,
                callerContext.IsAuthenticated);
            var instructions = BuildCustomerInstructions(setting, callerContext) +
                               AiAssistantBusinessIntentCatalog.BuildRoutingDirective(routes);
            var tools = _dataProvider.GetCustomerToolDeclarations(callerContext.IsAuthenticated);
            Func<string, JsonElement, CancellationToken, Task<object>> executeTool =
                (name, args, ct) => _dataProvider.ExecuteCustomerToolAsync(
                    name,
                    args,
                    callerContext,
                    ct);

            if (!IsProviderConfigured && routes.Count > 0)
            {
                _logger.LogWarning(
                    "Gemini API key is not configured; serving deterministic customer AI fallback.");
                return await BuildReadOnlyFallbackResponseAsync(
                    request,
                    model,
                    Guid.NewGuid().ToString("N"),
                    0,
                    0,
                    new HashSet<string>(StringComparer.OrdinalIgnoreCase),
                    new List<FallbackToolResult>(),
                    routes,
                    executeTool,
                    timeoutCts.Token);
            }

            return await RunToolConversationAsync(
                request,
                model,
                setting.AiAssistantMaxOutputTokens,
                instructions,
                tools,
                routes,
                executeTool,
                timeoutCts.Token);
        }
        catch (OperationCanceledException exception)
            when (timeoutCts.IsCancellationRequested
                  && !cancellationToken.IsCancellationRequested)
        {
            throw CreateTimeoutException(exception, "customer");
        }
        catch (DbException exception)
        {
            _logger.LogError(
                exception,
                "Customer AI request could not read restaurant data from the database.");
            throw new InvalidOperationException(
                "Không đọc được dữ liệu nhà hàng từ cơ sở dữ liệu. Vui lòng kiểm tra SQL Server rồi thử lại.",
                exception);
        }
    }

    public async Task<AiAssistantChatResponseDto> AdminChatAsync(
        AiAssistantChatRequestDto request,
        Guid adminUserId,
        CancellationToken cancellationToken = default)
    {
        if (adminUserId == Guid.Empty)
            throw new ArgumentException("Tài khoản quản trị không hợp lệ.");

        using var timeoutCts = CreateRequestTimeout(cancellationToken);

        try
        {
            var setting = await ValidateChatAsync(
                request,
                requirePublicEnabled: false,
                cancellationToken: timeoutCts.Token,
                requireProviderConfigured: false);
            var model = ResolveModel(setting.AiAssistantModel);
            var routes = AiAssistantBusinessIntentCatalog.ResolveAdmin(request.Message);
            var instructions = BuildAdminInstructions(setting) +
                               AiAssistantBusinessIntentCatalog.BuildRoutingDirective(routes);
            var tools = _dataProvider.GetAdminToolDeclarations();
            Func<string, JsonElement, CancellationToken, Task<object>> executeTool =
                (name, args, ct) => _dataProvider.ExecuteAdminToolAsync(name, args, ct);

            if (!IsProviderConfigured && routes.Count > 0)
            {
                _logger.LogWarning(
                    "Gemini API key is not configured; serving deterministic admin AI fallback.");
                return await BuildReadOnlyFallbackResponseAsync(
                    request,
                    model,
                    Guid.NewGuid().ToString("N"),
                    0,
                    0,
                    new HashSet<string>(StringComparer.OrdinalIgnoreCase),
                    new List<FallbackToolResult>(),
                    routes,
                    executeTool,
                    timeoutCts.Token);
            }

            return await RunToolConversationAsync(
                request,
                model,
                setting.AiAssistantMaxOutputTokens,
                instructions,
                tools,
                routes,
                executeTool,
                timeoutCts.Token);
        }
        catch (OperationCanceledException exception)
            when (timeoutCts.IsCancellationRequested
                  && !cancellationToken.IsCancellationRequested)
        {
            throw CreateTimeoutException(exception, "admin");
        }
        catch (DbException exception)
        {
            _logger.LogError(
                exception,
                "Admin AI request could not read restaurant data from the database.");
            throw new InvalidOperationException(
                "Không đọc được dữ liệu vận hành từ cơ sở dữ liệu. Vui lòng kiểm tra SQL Server rồi thử lại.",
                exception);
        }
    }

    private async Task<RestaurantSetting> ValidateChatAsync(
        AiAssistantChatRequestDto request,
        bool requirePublicEnabled,
        CancellationToken cancellationToken,
        bool requireProviderConfigured = true)
    {
        ArgumentNullException.ThrowIfNull(request);

        var message = request.Message?.Trim() ?? string.Empty;
        if (message.Length == 0)
            throw new ArgumentException("Vui lòng nhập nội dung cần hỏi AI.");
        if (message.Length > MaxMessageLength)
            throw new ArgumentException($"Tin nhắn AI tối đa {MaxMessageLength} ký tự.");

        var setting = await RequireActiveSettingAsync(cancellationToken);
        if (requirePublicEnabled && !setting.AiAssistantEnabled)
            throw new InvalidOperationException("Trợ lý AI đang được quản trị viên tắt.");
        if (requireProviderConfigured && !IsProviderConfigured)
            throw new InvalidOperationException(
                "Google AI Studio API key chưa được cấu hình trên máy chủ.");

        return setting;
    }

    private static CancellationTokenSource CreateRequestTimeout(
        CancellationToken cancellationToken)
    {
        var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(ToolConversationTimeout);
        return timeoutCts;
    }

    private InvalidOperationException CreateTimeoutException(
        OperationCanceledException exception,
        string audience)
    {
        _logger.LogWarning(
            exception,
            "Gemini {Audience} request timed out after {TimeoutSeconds} seconds.",
            audience,
            ToolConversationTimeout.TotalSeconds);

        return new InvalidOperationException(
            "Gemini phản hồi quá lâu. Vui lòng kiểm tra kết nối máy chủ rồi thử lại.",
            exception);
    }

    private bool IsProviderConfigured => !string.IsNullOrWhiteSpace(_options.ApiKey);

    private async Task<RestaurantSetting?> GetActiveSettingAsync(
        CancellationToken cancellationToken)
    {
        return await _dbContext.RestaurantSettings
            .Where(item => item.IsActive)
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<RestaurantSetting> RequireActiveSettingAsync(
        CancellationToken cancellationToken)
    {
        return await GetActiveSettingAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "Chưa có cấu hình nhà hàng đang hoạt động để gắn trợ lý AI.");
    }

    private AiAssistantAdminConfigDto MapAdminConfig(RestaurantSetting setting)
    {
        return new AiAssistantAdminConfigDto
        {
            Enabled = setting.AiAssistantEnabled,
            ProviderConfigured = IsProviderConfigured,
            Model = ResolveModel(setting.AiAssistantModel),
            WelcomeMessage = setting.AiAssistantWelcomeMessage ?? string.Empty,
            SystemPrompt = setting.AiAssistantSystemPrompt ?? string.Empty,
            KnowledgeBase = setting.AiAssistantKnowledgeBase ?? string.Empty,
            SuggestedQuestions = ParseSuggestedQuestions(setting.AiAssistantSuggestedQuestions),
            MaxOutputTokens = setting.AiAssistantMaxOutputTokens,
            UpdatedAt = setting.UpdatedAt
        };
    }
}

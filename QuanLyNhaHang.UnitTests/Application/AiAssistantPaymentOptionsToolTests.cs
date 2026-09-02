using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.AiAssistant;
using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.AI;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class AiAssistantPaymentOptionsToolTests
{
    [Fact]
    public async Task PaymentMethodsQuestion_ForcesPaymentToolBeforeGeminiAnswers()
    {
        await using var context = CreateContext();
        var setting = CreateSetting();
        setting.UpdateAiAssistant(
            enabled: true,
            model: "gemini-3.7-flash",
            welcomeMessage: "Xin chào",
            systemPrompt: null,
            knowledgeBase: null,
            suggestedQuestions: null,
            maxOutputTokens: 500);
        context.RestaurantSettings.Add(setting);
        await context.SaveChangesAsync();

        var handler = new RecordingGeminiHandler(
            """
            {
              "candidates": [{
                "content": {
                  "role": "model",
                  "parts": [{
                    "functionCall": {
                      "name": "get_payment_options",
                      "id": "payment-call-1",
                      "args": {}
                    }
                  }]
                }
              }],
              "usageMetadata": { "promptTokenCount": 10, "candidatesTokenCount": 3 }
            }
            """,
            """
            {
              "candidates": [{
                "content": {
                  "role": "model",
                  "parts": [{ "text": "Nhà hàng hỗ trợ QR/chuyển khoản và các phương thức tại quầy." }]
                }
              }],
              "usageMetadata": { "promptTokenCount": 20, "candidatesTokenCount": 8 }
            }
            """);
        using var httpClient = new HttpClient(handler);
        var service = new GeminiAiAssistantService(
            httpClient,
            context,
            new FakePaymentGateway(configured: true),
            new FakePaymentChannelReadiness(required: true, ready: true),
            Options.Create(new GeminiOptions
            {
                ApiKey = "test-api-key",
                BaseUrl = "https://gemini.test/v1beta",
                DefaultModel = "gemini-3.7-flash"
            }),
            NullLogger<GeminiAiAssistantService>.Instance);

        var response = await service.ChatAsync(
            new AiAssistantChatRequestDto
            {
                Message = "Nhà hàng có các phương thức thanh toán nào?"
            },
            new AiAssistantCallerContext(),
            CancellationToken.None);

        Assert.Equal(2, handler.RequestBodies.Count);
        using var firstRequest = JsonDocument.Parse(handler.RequestBodies[0]);
        var firstCallingConfig = firstRequest.RootElement
            .GetProperty("toolConfig")
            .GetProperty("functionCallingConfig");
        Assert.Equal("ANY", firstCallingConfig.GetProperty("mode").GetString());
        Assert.Equal(
            AiAssistantToolNames.PaymentOptions,
            Assert.Single(firstCallingConfig
                .GetProperty("allowedFunctionNames")
                .EnumerateArray())
                .GetString());

        using var secondRequest = JsonDocument.Parse(handler.RequestBodies[1]);
        Assert.Equal(
            "AUTO",
            secondRequest.RootElement
                .GetProperty("toolConfig")
                .GetProperty("functionCallingConfig")
                .GetProperty("mode")
                .GetString());
        Assert.Contains("Phương thức thanh toán", response.DataSources);
        Assert.True(response.Message.Contains("QR/chuyển khoản", StringComparison.Ordinal));
    }

    [Fact]
    public async Task CustomerTool_ReturnsSupportedFlowsWithoutAdminPaymentStatistics()
    {
        await using var context = CreateContext();
        context.RestaurantSettings.Add(CreateSetting());
        context.Payments.Add(new Payment(
            Guid.NewGuid(),
            120_000m,
            0m,
            0m,
            120_000m,
            "Cash",
            null));
        await context.SaveChangesAsync();

        var provider = new AiAssistantDataProvider(
            context,
            new FakePaymentGateway(configured: true),
            new FakePaymentChannelReadiness(required: true, ready: true));

        var result = await provider.ExecuteCustomerToolAsync(
            AiAssistantToolNames.PaymentOptions,
            JsonSerializer.SerializeToElement(new { }),
            new AiAssistantCallerContext(),
            CancellationToken.None);
        var json = JsonSerializer.SerializeToElement(result);

        Assert.Equal("Customer", json.GetProperty("audience").GetString());
        Assert.Equal("VND", json.GetProperty("currency").GetString());
        var customerWeb = Assert.Single(json.GetProperty("customerWeb").EnumerateArray());
        Assert.Equal("BankTransfer", customerWeb.GetProperty("code").GetString());
        Assert.True(customerWeb.GetProperty("availableNow").GetBoolean());
        Assert.Equal(7, json.GetProperty("atCounter").GetArrayLength());
        Assert.False(json.TryGetProperty("observedPaidMethods", out _));
        Assert.False(json.GetRawText().Contains("AccountNumber", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task CustomerTool_ReportsQrUnavailableWhenWebhookIsNotReady()
    {
        await using var context = CreateContext();
        context.RestaurantSettings.Add(CreateSetting());
        await context.SaveChangesAsync();

        var provider = new AiAssistantDataProvider(
            context,
            new FakePaymentGateway(configured: true),
            new FakePaymentChannelReadiness(required: true, ready: false));

        var result = await provider.ExecuteCustomerToolAsync(
            AiAssistantToolNames.PaymentOptions,
            JsonSerializer.SerializeToElement(new { }),
            new AiAssistantCallerContext(),
            CancellationToken.None);
        var json = JsonSerializer.SerializeToElement(result);
        var customerWeb = Assert.Single(json.GetProperty("customerWeb").EnumerateArray());

        Assert.False(customerWeb.GetProperty("availableNow").GetBoolean());
        Assert.True(
            customerWeb.GetProperty("availability").GetString()!
                .Contains("webhook", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task AdminTool_ReturnsCatalogReadinessAndObservedPaidMethodsReadOnly()
    {
        await using var context = CreateContext();
        context.Payments.AddRange(
            new Payment(Guid.NewGuid(), 100_000m, 0m, 0m, 100_000m, "Cash", null),
            new Payment(Guid.NewGuid(), 150_000m, 0m, 0m, 150_000m, "BankTransfer", null));
        await context.SaveChangesAsync();

        var provider = new AiAssistantDataProvider(
            context,
            new FakePaymentGateway(configured: true),
            new FakePaymentChannelReadiness(required: true, ready: true));

        var result = await provider.ExecuteAdminToolAsync(
            AiAssistantToolNames.PaymentOptions,
            JsonSerializer.SerializeToElement(new { }),
            CancellationToken.None);
        var json = JsonSerializer.SerializeToElement(result);

        Assert.Equal("Admin", json.GetProperty("audience").GetString());
        Assert.Equal(7, json.GetProperty("supportedMethods").GetArrayLength());
        Assert.Equal(2, json.GetProperty("observedPaidMethods").GetArrayLength());
        Assert.True(json.GetProperty("onlineChannel").GetProperty("availableNow").GetBoolean());
        Assert.True(json.GetProperty("readOnly").GetBoolean());
        Assert.False(json.GetRawText().Contains("AccountNumber", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.GetRawText().Contains("ApiKey", StringComparison.OrdinalIgnoreCase));
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"ai-payment-options-{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(options);
    }

    private static RestaurantSetting CreateSetting()
        => new(
            "Nhà hàng test",
            "123 Đường Test",
            "0900000000",
            null,
            null,
            null,
            null,
            8m,
            5m,
            "VND",
            "08:00",
            "22:00",
            null,
            null);

    private sealed class FakePaymentGateway : IPaymentGateway
    {
        public FakePaymentGateway(bool configured)
        {
            IsConfigured = configured;
        }

        public string Provider => "SePay";

        public bool IsConfigured { get; }

        public PaymentInstruction CreatePaymentInstruction(long providerOrderCode, int amount)
            => throw new InvalidOperationException("Read-only AI tests must not create payments.");
    }

    private sealed class FakePaymentChannelReadiness : IPaymentChannelReadiness
    {
        private readonly bool _required;
        private readonly bool _ready;

        public FakePaymentChannelReadiness(bool required, bool ready)
        {
            _required = required;
            _ready = ready;
        }

        public PaymentChannelReadinessSnapshot GetSnapshot()
            => new(_required, _ready, DateTime.UtcNow, DateTime.UtcNow.AddMinutes(1));

        public PaymentChannelReadinessSnapshot ConfirmExternalHeartbeat()
            => throw new InvalidOperationException("Read-only AI tests must not mutate readiness state.");
    }

    private sealed class RecordingGeminiHandler : HttpMessageHandler
    {
        private readonly Queue<string> _responses;

        public RecordingGeminiHandler(params string[] responses)
        {
            _responses = new Queue<string>(responses);
        }

        public List<string> RequestBodies { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestBodies.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            if (_responses.Count == 0)
                throw new InvalidOperationException("Gemini test received an unexpected request.");

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    _responses.Dequeue(),
                    Encoding.UTF8,
                    "application/json")
            };
        }
    }
}

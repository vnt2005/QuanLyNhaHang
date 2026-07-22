using System.Collections;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using MediatR;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Common.Behaviors;

public class ActivityLogBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IActivityLogService _activityLogService;
    private readonly ICurrentUserService _currentUserService;

    public ActivityLogBehavior(
        IActivityLogService activityLogService,
        ICurrentUserService currentUserService)
    {
        _activityLogService = activityLogService;
        _currentUserService = currentUserService;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!ShouldLogRequest())
            return await next(cancellationToken);

        var requestName = typeof(TRequest).Name;
        var moduleName = GetModuleName();

        // Không log chính module ActivityLogs để tránh log lồng log.
        if (moduleName == "ActivityLogs")
            return await next(cancellationToken);

        var action = GetAction(requestName);
        var entityName = GetEntityName(moduleName);
        var entityId = GetEntityId(request);

        var requestJson = SerializeSafe(request);

        try
        {
            var response = await next(cancellationToken);

            entityId ??= GetEntityId(response);

            await _activityLogService.LogAsync(
                _currentUserService.UserId,
                _currentUserService.UserName ?? "System",
                action,
                moduleName,
                entityName,
                entityId,
                $"Thực hiện {action} trong module {moduleName} thành công.",
                null,
                requestJson,
                _currentUserService.IpAddress,
                _currentUserService.UserAgent,
                "Success",
                cancellationToken);

            return response;
        }
        catch (Exception ex)
        {
            await _activityLogService.LogAsync(
                _currentUserService.UserId,
                _currentUserService.UserName ?? "System",
                action,
                moduleName,
                entityName,
                entityId,
                $"Thực hiện {action} trong module {moduleName} thất bại. Lỗi: {ex.Message}",
                null,
                requestJson,
                _currentUserService.IpAddress,
                _currentUserService.UserAgent,
                "Failed",
                cancellationToken);

            throw;
        }
    }

    private static bool ShouldLogRequest()
    {
        var requestName = typeof(TRequest).Name;

        return requestName.EndsWith("Command") ||
               requestName.EndsWith("Query");
    }

    private static string GetModuleName()
    {
        var namespaceName = typeof(TRequest).Namespace ?? string.Empty;

        var marker = ".Features.";
        var index = namespaceName.IndexOf(marker, StringComparison.Ordinal);

        if (index < 0)
            return "Unknown";

        var featurePart = namespaceName[(index + marker.Length)..];

        return featurePart.Split('.')[0];
    }

    private static string GetAction(string requestName)
    {
        requestName = requestName
            .Replace("Command", string.Empty)
            .Replace("Query", string.Empty);

        var actions = new[]
        {
            "Create",
            "Update",
            "Delete",
            "Cancel",
            "Import",
            "Export",
            "Adjust",
            "Apply",
            "Login",
            "Register",
            "Verify",
            "Activate",
            "Deactivate",
            "Transfer",
            "Merge",
            "Split",
            "Confirm",
            "CheckIn",
            "Complete",
            "Get",
            "Search"
        };

        foreach (var action in actions)
        {
            if (requestName.StartsWith(action))
                return action;
        }

        return requestName;
    }

    private static string GetEntityName(string moduleName)
    {
        if (moduleName.EndsWith("ies"))
            return moduleName[..^3] + "y";

        if (moduleName.EndsWith("s"))
            return moduleName[..^1];

        return moduleName;
    }

    private static Guid? GetEntityId(object? obj)
    {
        if (obj == null)
            return null;

        var type = obj.GetType();

        var idProperty = type.GetProperty("Id");

        if (idProperty != null &&
            idProperty.PropertyType == typeof(Guid))
        {
            var value = idProperty.GetValue(obj);

            if (value is Guid id && id != Guid.Empty)
                return id;
        }

        var entityIdProperty = type.GetProperty("EntityId");

        if (entityIdProperty != null &&
            entityIdProperty.PropertyType == typeof(Guid?))
        {
            var value = entityIdProperty.GetValue(obj);

            if (value is Guid id && id != Guid.Empty)
                return id;
        }

        return null;
    }

    private static string? SerializeSafe(object? obj)
    {
        if (obj == null)
            return null;

        var sanitized = SanitizeObject(obj, 0);

        var options = new JsonSerializerOptions
        {
            WriteIndented = false,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        return JsonSerializer.Serialize(sanitized, options);
    }

    private static object? SanitizeObject(object? obj, int depth)
    {
        if (obj == null)
            return null;

        if (depth > 3)
            return "...";

        var type = obj.GetType();

        if (IsSimpleType(type))
            return obj;

        if (obj is IEnumerable enumerable && obj is not string)
        {
            var list = new List<object?>();

            foreach (var item in enumerable)
            {
                list.Add(SanitizeObject(item, depth + 1));
            }

            return list;
        }

        var result = new Dictionary<string, object?>();

        var properties = type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(x => x.CanRead);

        foreach (var property in properties)
        {
            var propertyName = property.Name;

            if (IsSensitiveProperty(propertyName))
            {
                result[propertyName] = "***";
                continue;
            }

            var value = property.GetValue(obj);

            result[propertyName] = SanitizeObject(value, depth + 1);
        }

        return result;
    }

    private static bool IsSimpleType(Type type)
    {
        return type.IsPrimitive ||
               type.IsEnum ||
               type == typeof(string) ||
               type == typeof(decimal) ||
               type == typeof(Guid) ||
               type == typeof(Guid?) ||
               type == typeof(DateTime) ||
               type == typeof(DateTime?) ||
               type == typeof(bool) ||
               type == typeof(bool?) ||
               type == typeof(int) ||
               type == typeof(int?) ||
               type == typeof(long) ||
               type == typeof(long?) ||
               type == typeof(double) ||
               type == typeof(double?) ||
               type == typeof(decimal?);
    }

    private static bool IsSensitiveProperty(string propertyName)
    {
        var name = propertyName.ToLowerInvariant();

        if (name.Contains("password") ||
            name.Contains("token") ||
            name.Contains("secret") ||
            name.Contains("otp") ||
            name.Contains("twofactor"))
        {
            return true;
        }

        // Chỉ che mã dùng để xác thực; vẫn giữ mã nghiệp vụ như
        // EmployeeCode, PromotionCode và TableQrCode cho mục đích kiểm toán.
        return name is "code" or "codehash" ||
               name.Contains("authcode") ||
               name.Contains("authenticationcode") ||
               name.Contains("authorizationcode") ||
               name.Contains("verificationcode") ||
               name.Contains("confirmationcode") ||
               name.Contains("resetcode") ||
               name.Contains("recoverycode") ||
               name.Contains("securitycode") ||
               name.Contains("challengecode");
    }
}
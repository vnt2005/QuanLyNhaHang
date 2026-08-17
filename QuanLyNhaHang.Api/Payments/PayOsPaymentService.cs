using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace QuanLyNhaHang.Api.Payments;

public sealed record PayOsPaymentLink(
    long OrderCode,
    int Amount,
    string PaymentLinkId,
    string Status,
    string CheckoutUrl,
    string QrCode);

public sealed record PayOsWebhookPayment(
    long OrderCode,
    int Amount,
    string Code,
    string Reference,
    string PaymentLinkId,
    bool Success);

public sealed class PayOsPaymentService
{
    private static readonly HttpClient HttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(15)
    };

    private readonly string _clientId;
    private readonly string _apiKey;
    private readonly string _checksumKey;
    private readonly string _baseUrl;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_clientId) &&
        !string.IsNullOrWhiteSpace(_apiKey) &&
        !string.IsNullOrWhiteSpace(_checksumKey) &&
        Uri.TryCreate(CustomerWebBaseUrl, UriKind.Absolute, out _);

    public string CustomerWebBaseUrl { get; }

    public PayOsPaymentService(IConfiguration configuration)
    {
        _clientId = configuration["PayOS:ClientId"]?.Trim() ?? string.Empty;
        _apiKey = configuration["PayOS:ApiKey"]?.Trim() ?? string.Empty;
        _checksumKey = configuration["PayOS:ChecksumKey"]?.Trim() ?? string.Empty;
        CustomerWebBaseUrl = (configuration["PayOS:CustomerWebBaseUrl"] ??
                              "http://localhost:5174").Trim().TrimEnd('/');
        _baseUrl = (configuration["PayOS:BaseUrl"] ??
                    "https://api-merchant.payos.vn").Trim().TrimEnd('/');
    }

    public async Task<PayOsPaymentLink> CreatePaymentLinkAsync(
        long orderCode,
        int amount,
        string description,
        string returnUrl,
        string cancelUrl,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();

        var signatureData =
            $"amount={amount}&cancelUrl={cancelUrl}&description={description}" +
            $"&orderCode={orderCode}&returnUrl={returnUrl}";

        var requestBody = new
        {
            orderCode,
            amount,
            description,
            cancelUrl,
            returnUrl,
            signature = Sign(signatureData)
        };

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{_baseUrl}/v2/payment-requests")
        {
            Content = JsonContent.Create(requestBody)
        };
        request.Headers.Add("x-client-id", _clientId);
        request.Headers.Add("x-api-key", _apiKey);

        using var response = await HttpClient.SendAsync(
            request,
            cancellationToken);

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var code = root.TryGetProperty("code", out var codeElement)
            ? codeElement.GetString()
            : null;
        var descriptionFromGateway = root.TryGetProperty("desc", out var descElement)
            ? descElement.GetString()
            : null;

        if (!response.IsSuccessStatusCode || code != "00" ||
            !root.TryGetProperty("data", out var data))
        {
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(descriptionFromGateway)
                    ? "Không tạo được liên kết thanh toán payOS."
                    : $"payOS: {descriptionFromGateway}");
        }

        return new PayOsPaymentLink(
            data.GetProperty("orderCode").GetInt64(),
            data.GetProperty("amount").GetInt32(),
            data.GetProperty("paymentLinkId").GetString() ?? string.Empty,
            data.GetProperty("status").GetString() ?? "PENDING",
            data.GetProperty("checkoutUrl").GetString() ?? string.Empty,
            data.TryGetProperty("qrCode", out var qrCode)
                ? qrCode.GetString() ?? string.Empty
                : string.Empty);
    }

    public PayOsWebhookPayment VerifyWebhook(JsonElement payload)
    {
        EnsureConfigured();

        if (!payload.TryGetProperty("signature", out var signatureElement) ||
            !payload.TryGetProperty("data", out var dataElement) ||
            dataElement.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidOperationException("Webhook payOS thiếu dữ liệu xác thực.");
        }

        var signature = signatureElement.GetString() ?? string.Empty;
        var canonicalData = string.Join(
            "&",
            dataElement.EnumerateObject()
                .OrderBy(property => property.Name, StringComparer.Ordinal)
                .Select(property =>
                    $"{property.Name}={CanonicalValue(property.Value)}"));

        var expectedSignature = Sign(canonicalData);
        if (!FixedTimeEquals(signature, expectedSignature))
            throw new InvalidOperationException("Chữ ký webhook payOS không hợp lệ.");

        var success = payload.TryGetProperty("success", out var successElement) &&
                      successElement.ValueKind == JsonValueKind.True;

        return new PayOsWebhookPayment(
            dataElement.GetProperty("orderCode").GetInt64(),
            dataElement.GetProperty("amount").GetInt32(),
            dataElement.TryGetProperty("code", out var dataCode)
                ? dataCode.GetString() ?? string.Empty
                : string.Empty,
            dataElement.TryGetProperty("reference", out var reference)
                ? reference.GetString() ?? string.Empty
                : string.Empty,
            dataElement.TryGetProperty("paymentLinkId", out var paymentLinkId)
                ? paymentLinkId.GetString() ?? string.Empty
                : string.Empty,
            success);
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException(
                "payOS chưa được cấu hình. Hãy thiết lập ClientId, ApiKey và ChecksumKey ở biến môi trường.");
        }
    }

    private string Sign(string data)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_checksumKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string CanonicalValue(JsonElement value)
        => value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? string.Empty,
            JsonValueKind.Number => value.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null or JsonValueKind.Undefined => string.Empty,
            _ => value.GetRawText()
        };

    private static bool FixedTimeEquals(string actual, string expected)
    {
        var actualBytes = Encoding.ASCII.GetBytes(actual.ToLowerInvariant());
        var expectedBytes = Encoding.ASCII.GetBytes(expected.ToLowerInvariant());
        return actualBytes.Length == expectedBytes.Length &&
               CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes);
    }
}

namespace QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;

public enum CustomerPaymentOutcome
{
    Success,
    NotFound,
    Conflict,
    Invalid,
    Unavailable
}

public sealed record CustomerPaymentResult<T>(
    CustomerPaymentOutcome Outcome,
    T? Value = default,
    string? Message = null,
    string? Code = null,
    string? OrderStatus = null,
    Guid? AttemptId = null,
    string? AttemptStatus = null,
    DateTime? LastConfirmedAtUtc = null)
{
    public static CustomerPaymentResult<T> Success(T value)
        => new(CustomerPaymentOutcome.Success, value);

    public static CustomerPaymentResult<T> NotFound(string message)
        => new(CustomerPaymentOutcome.NotFound, Message: message);

    public static CustomerPaymentResult<T> Conflict(
        string message,
        string? orderStatus = null,
        Guid? attemptId = null,
        string? attemptStatus = null)
        => new(
            CustomerPaymentOutcome.Conflict,
            Message: message,
            OrderStatus: orderStatus,
            AttemptId: attemptId,
            AttemptStatus: attemptStatus);

    public static CustomerPaymentResult<T> Invalid(string message)
        => new(CustomerPaymentOutcome.Invalid, Message: message);

    public static CustomerPaymentResult<T> Unavailable(
        string message,
        string? code = null,
        DateTime? lastConfirmedAtUtc = null)
        => new(
            CustomerPaymentOutcome.Unavailable,
            Message: message,
            Code: code,
            LastConfirmedAtUtc: lastConfirmedAtUtc);
}

public sealed class CustomerPaymentInstructionDto
{
    public bool Success { get; init; } = true;
    public bool AlreadyPaid { get; init; }
    public bool? Reused { get; init; }
    public Guid? OrderId { get; init; }
    public string? OrderCode { get; init; }
    public Guid? AttemptId { get; init; }
    public string? AttemptStatus { get; init; }
    public DateTime? ExpiresAt { get; init; }
    public string? QrCode { get; init; }
    public string? TransferContent { get; init; }
    public string? BankCode { get; init; }
    public string? AccountNumber { get; init; }
    public string? AccountHolder { get; init; }
    public string? PaymentCode { get; init; }
    public decimal Amount { get; init; }
    public decimal? Subtotal { get; init; }
    public decimal? DiscountAmount { get; init; }
    public decimal? ServiceChargeAmount { get; init; }
    public decimal? VatAmount { get; init; }
    public string? PaymentMethod { get; init; }
}

public sealed class CancelPaymentAttemptDto
{
    public bool Success { get; init; } = true;
    public string? AttemptStatus { get; init; }
    public bool? RequiresReview { get; init; }
}

public sealed class CustomerPaymentStatusDto
{
    public Guid OrderId { get; init; }
    public string OrderCode { get; init; } = string.Empty;
    public string OrderStatus { get; init; } = string.Empty;
    public bool Paid { get; init; }
    public bool CanPay { get; init; }
    public string? PaymentUnavailableReason { get; init; }
    public string? PaymentCode { get; init; }
    public decimal? Amount { get; init; }
    public DateTime? PaidAt { get; init; }
    public string? PaymentMethod { get; init; }
    public bool PaymentChannelReady { get; init; }
    public bool PaymentChannelRequired { get; init; }
    public DateTime? PaymentChannelLastConfirmedAt { get; init; }
    public Guid? AttemptId { get; init; }
    public string? AttemptStatus { get; init; }
    public bool RequiresReview { get; init; }
    public string? ReviewReason { get; init; }
    public decimal? ExpectedAmount { get; init; }
    public decimal? ReceivedAmount { get; init; }
    public DateTime? ExpiresAt { get; init; }
    public string? QrCode { get; init; }
    public string? TransferContent { get; init; }
    public string? BankCode { get; init; }
    public string? AccountNumber { get; init; }
    public string? AccountHolder { get; init; }
}

public sealed record PaymentChannelState(
    bool Required,
    bool Ready,
    DateTime? LastConfirmedAtUtc);

public sealed record IncomingPaymentTransaction(
    string PaymentCode,
    decimal Amount,
    string TransactionId,
    DateTime OccurredAtUtc,
    string BankReference,
    string Gateway);

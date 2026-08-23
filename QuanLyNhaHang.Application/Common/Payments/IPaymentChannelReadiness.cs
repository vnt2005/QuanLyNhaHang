namespace QuanLyNhaHang.Application.Common.Payments;

public sealed record PaymentChannelReadinessSnapshot(
    bool Required,
    bool Ready,
    DateTime? LastConfirmedAtUtc,
    DateTime? ValidUntilUtc);

public interface IPaymentChannelReadiness
{
    PaymentChannelReadinessSnapshot GetSnapshot();

    PaymentChannelReadinessSnapshot ConfirmExternalHeartbeat();
}

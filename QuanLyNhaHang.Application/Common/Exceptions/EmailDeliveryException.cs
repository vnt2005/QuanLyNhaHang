namespace QuanLyNhaHang.Application.Common.Exceptions;

public sealed class EmailDeliveryException : Exception
{
    public EmailDeliveryException(
        string message,
        Exception? innerException = null)
        : base(message, innerException)
    {
    }
}

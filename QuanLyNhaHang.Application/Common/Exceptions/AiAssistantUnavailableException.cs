namespace QuanLyNhaHang.Application.Common.Exceptions;

public sealed class AiAssistantUnavailableException : Exception
{
    public const string PublicMessage =
        "Trợ lý AI đang tạm thời gặp sự cố. Vui lòng thử lại sau.";

    public AiAssistantUnavailableException(Exception? innerException = null)
        : base(PublicMessage, innerException)
    {
    }
}

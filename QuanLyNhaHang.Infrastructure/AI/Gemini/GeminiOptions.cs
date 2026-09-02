namespace QuanLyNhaHang.Infrastructure.AI;

public sealed class GeminiOptions
{
    public const string SectionName = "GoogleAI";

    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
    public string DefaultModel { get; set; } = "gemini-3.7-flash";
}

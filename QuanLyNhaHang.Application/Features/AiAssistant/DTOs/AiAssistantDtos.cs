namespace QuanLyNhaHang.Application.Features.AiAssistant.DTOs;

public class AiAssistantPublicConfigDto
{
    public bool Enabled { get; set; }
    public bool ProviderConfigured { get; set; }
    public string WelcomeMessage { get; set; } = string.Empty;
    public List<string> SuggestedQuestions { get; set; } = new();
}

public sealed class AiAssistantAdminConfigDto : AiAssistantPublicConfigDto
{
    public string Model { get; set; } = string.Empty;
    public string SystemPrompt { get; set; } = string.Empty;
    public string KnowledgeBase { get; set; } = string.Empty;
    public int MaxOutputTokens { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class UpdateAiAssistantConfigDto
{
    public bool Enabled { get; set; }
    public string Model { get; set; } = string.Empty;
    public string WelcomeMessage { get; set; } = string.Empty;
    public string SystemPrompt { get; set; } = string.Empty;
    public string KnowledgeBase { get; set; } = string.Empty;
    public List<string> SuggestedQuestions { get; set; } = new();
    public int MaxOutputTokens { get; set; } = 500;
}

public sealed class AiAssistantChatRequestDto
{
    public string Message { get; set; } = string.Empty;
    public List<AiAssistantChatMessageDto> History { get; set; } = new();
}

public sealed class AiAssistantChatMessageDto
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public sealed class AiAssistantCallerContext
{
    public Guid? UserId { get; set; }
    public string? Role { get; set; }
    public string? ClientId { get; set; }
    public bool IsAuthenticated => UserId.HasValue;
}

public sealed class AiAssistantChatResponseDto
{
    public string Message { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public bool Blocked { get; set; }
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public string? ProviderRequestId { get; set; }
    public List<string> DataSources { get; set; } = new();
}

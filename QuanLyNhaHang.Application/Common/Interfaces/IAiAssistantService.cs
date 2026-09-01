using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;

namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface IAiAssistantService
{
    Task<AiAssistantPublicConfigDto> GetPublicConfigAsync(
        CancellationToken cancellationToken = default);

    Task<AiAssistantAdminConfigDto> GetAdminConfigAsync(
        CancellationToken cancellationToken = default);

    Task<AiAssistantAdminConfigDto> UpdateConfigAsync(
        UpdateAiAssistantConfigDto input,
        CancellationToken cancellationToken = default);

    Task<AiAssistantChatResponseDto> ChatAsync(
        AiAssistantChatRequestDto request,
        string safetyIdentifier,
        CancellationToken cancellationToken = default);
}

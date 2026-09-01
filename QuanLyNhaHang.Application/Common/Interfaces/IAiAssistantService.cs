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
        AiAssistantCallerContext callerContext,
        CancellationToken cancellationToken = default);

    Task<AiAssistantChatResponseDto> AdminChatAsync(
        AiAssistantChatRequestDto request,
        Guid adminUserId,
        CancellationToken cancellationToken = default);
}

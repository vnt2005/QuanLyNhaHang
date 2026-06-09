using MediatR;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;

namespace QuanLyNhaHang.Application.Features.Promotions.Commands.Create;

public class ApplyPromotionCommand : IRequest<ApplyPromotionResultDto>
{
    public Guid OrderId { get; set; }

    public string PromotionCode { get; set; } = string.Empty;

    public string? Note { get; set; }
}
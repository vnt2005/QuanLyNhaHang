using MediatR;
using QuanLyNhaHang.Application.Features.Auth.DTOs;

namespace QuanLyNhaHang.Application.Features.Auth.Queries.GetCurrentSession;

public sealed class GetCurrentSessionQuery : IRequest<CurrentSessionDto>
{
}

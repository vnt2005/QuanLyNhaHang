using MediatR;
using QuanLyNhaHang.Application.Features.Auth.DTOs;

namespace QuanLyNhaHang.Application.Features.Auth.Queries.GetAuthSessions;

public sealed class GetAuthSessionsQuery
    : IRequest<IReadOnlyCollection<AuthSessionDto>>
{
}

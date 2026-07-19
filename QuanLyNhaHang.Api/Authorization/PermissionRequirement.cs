using Microsoft.AspNetCore.Authorization;

namespace QuanLyNhaHang.Api.Authorization;

public sealed record PermissionRequirement(string PermissionCode)
    : IAuthorizationRequirement;
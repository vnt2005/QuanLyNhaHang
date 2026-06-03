using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Areas.Commands.Create;

public class CreateAreaCommandHandler : IRequestHandler<CreateAreaCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateAreaCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(
        CreateAreaCommand request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        var nameExists = await _context.Areas
            .AnyAsync(x => x.Name == name, cancellationToken);

        if (nameExists)
        {
            throw new Exception("Tên khu vực đã tồn tại.");
        }

        var area = new Area(
            name,
            request.Description);

        _context.Areas.Add(area);

        await _context.SaveChangesAsync(cancellationToken);

        return area.Id;
    }
}
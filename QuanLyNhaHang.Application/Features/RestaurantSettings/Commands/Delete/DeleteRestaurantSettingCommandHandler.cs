using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Commands.Delete;

public class DeleteRestaurantSettingCommandHandler
    : IRequestHandler<DeleteRestaurantSettingCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteRestaurantSettingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteRestaurantSettingCommand request,
        CancellationToken cancellationToken)
    {
        var setting = await _context.RestaurantSettings
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (setting == null)
            throw new Exception("Không tìm thấy cài đặt nhà hàng.");

        setting.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
using System.Collections.Concurrent;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.IntegrationTests.Infrastructure;

public sealed record SentEmail(string To, string Subject, string Body);

public sealed class FakeEmailService : IEmailService
{
    private readonly ConcurrentQueue<SentEmail> _messages = new();

    public IReadOnlyList<SentEmail> Messages => _messages.ToArray();

    public Task SendAsync(string to, string subject, string body)
    {
        _messages.Enqueue(new SentEmail(to, subject, body));
        return Task.CompletedTask;
    }
}

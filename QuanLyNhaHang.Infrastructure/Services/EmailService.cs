using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QuanLyNhaHang.Application.Common.Exceptions;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Infrastructure.Services;

public class EmailService : IEmailService
{
    private const string DeliveryErrorMessage =
        "Không thể gửi email bảo mật lúc này. " +
        "Vui lòng thử lại sau hoặc liên hệ quản trị viên.";

    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IConfiguration configuration,
        ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendAsync(
        string to,
        string subject,
        string body)
    {
        var host = GetRequiredValue("Email:SmtpHost");
        var port = GetPort();
        var from = GetRequiredValue("Email:From");
        var enableSsl = GetBooleanValue(
            "Email:EnableSsl",
            defaultValue: true);
        var useAuthentication = GetBooleanValue(
            "Email:UseAuthentication",
            defaultValue: true);

        using var client = new SmtpClient(host, port)
        {
            DeliveryMethod = SmtpDeliveryMethod.Network,
            EnableSsl = enableSsl,
            UseDefaultCredentials = false
        };

        if (useAuthentication)
        {
            var username = GetRequiredValue("Email:Username");
            var password = GetRequiredValue("Email:Password");

            client.Credentials = new NetworkCredential(
                username,
                password);
        }

        using var mailMessage = new MailMessage
        {
            From = new MailAddress(from),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };

        mailMessage.To.Add(to);

        try
        {
            await client.SendMailAsync(mailMessage);
        }
        catch (SmtpException exception)
        {
            _logger.LogError(
                exception,
                "SMTP delivery failed using {SmtpHost}:{SmtpPort}.",
                host,
                port);

            throw new EmailDeliveryException(
                DeliveryErrorMessage,
                exception);
        }
    }

    private string GetRequiredValue(string key)
    {
        var value = _configuration[key];

        if (!string.IsNullOrWhiteSpace(value))
            return value.Trim();

        _logger.LogError(
            "Required email configuration {ConfigurationKey} is missing.",
            key);

        throw new EmailDeliveryException(DeliveryErrorMessage);
    }

    private int GetPort()
    {
        var value = GetRequiredValue("Email:SmtpPort");

        if (int.TryParse(value, out var port) &&
            port is > 0 and <= 65535)
        {
            return port;
        }

        _logger.LogError(
            "Email:SmtpPort is not a valid TCP port.");

        throw new EmailDeliveryException(DeliveryErrorMessage);
    }

    private bool GetBooleanValue(
        string key,
        bool defaultValue)
    {
        var value = _configuration[key];

        if (string.IsNullOrWhiteSpace(value))
            return defaultValue;

        if (bool.TryParse(value, out var parsed))
            return parsed;

        _logger.LogError(
            "Email configuration {ConfigurationKey} must be true or false.",
            key);

        throw new EmailDeliveryException(DeliveryErrorMessage);
    }
}

"""Email service for sending transactional emails."""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)


class EmailService:
    """Service for sending emails via SMTP."""

    def __init__(self):
        self.enabled = bool(settings.smtp_host and settings.smtp_port)
        if not self.enabled:
            logger.warning("Email service disabled: SMTP not configured")

    def _create_smtp_connection(self):
        """Create SMTP connection."""
        if settings.smtp_port == 465:
            # SSL
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port)
        else:
            # TLS
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
            server.starttls()

        if settings.smtp_user and settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)

        return server

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
    ) -> bool:
        """Send an email.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML content
            text_body: Plain text content (optional, generated from HTML if not provided)

        Returns:
            True if sent successfully, False otherwise
        """
        if not self.enabled:
            logger.info(f"Email not sent (disabled): to={to_email}, subject={subject}")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.from_email
            msg["To"] = to_email

            # Plain text version
            if text_body:
                msg.attach(MIMEText(text_body, "plain"))

            # HTML version
            msg.attach(MIMEText(html_body, "html"))

            with self._create_smtp_connection() as server:
                server.sendmail(settings.from_email, to_email, msg.as_string())

            logger.info(f"Email sent: to={to_email}, subject={subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email: to={to_email}, error={e}")
            return False

    def send_password_reset(self, to_email: str, reset_url: str) -> bool:
        """Send password reset email."""
        subject = "Reset your Modelisys password"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #10b981;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
                .footer {{ color: #6b7280; font-size: 14px; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Reset your password</h2>
                <p>We received a request to reset your Modelisys password. Click the button below to create a new password:</p>
                <a href="{reset_url}" class="button">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
                <div class="footer">
                    <p>Modelisys - Financial Modeling Platform</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
Reset your Modelisys password

We received a request to reset your password. Visit the link below to create a new password:

{reset_url}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Modelisys - Financial Modeling Platform
        """

        return self.send_email(to_email, subject, html_body, text_body)

    def send_welcome(self, to_email: str, full_name: str) -> bool:
        """Send welcome email to new users."""
        subject = "Welcome to Modelisys"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .footer {{ color: #6b7280; font-size: 14px; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Welcome to Modelisys, {full_name}!</h2>
                <p>Your account has been created successfully. You can now:</p>
                <ul>
                    <li>Upload trial balance data</li>
                    <li>Configure financial statement structures</li>
                    <li>Generate income statements, balance sheets, and cash flow statements</li>
                    <li>Create projections and budgets</li>
                    <li>Analyze financial ratios and trends</li>
                </ul>
                <p>If you have any questions, please don't hesitate to reach out.</p>
                <div class="footer">
                    <p>Modelisys - Financial Modeling Platform</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
Welcome to Modelisys, {full_name}!

Your account has been created successfully. You can now:

- Upload trial balance data
- Configure financial statement structures
- Generate income statements, balance sheets, and cash flow statements
- Create projections and budgets
- Analyze financial ratios and trends

If you have any questions, please don't hesitate to reach out.

Modelisys - Financial Modeling Platform
        """

        return self.send_email(to_email, subject, html_body, text_body)


# Singleton instance
email_service = EmailService()

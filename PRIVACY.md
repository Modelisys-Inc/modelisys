# Privacy Policy

Last updated: February 2026

## Overview

Modelisys ("we", "our", "us") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.

## Data We Collect

### Account Information
- Email address
- Full name
- Organization name
- Hashed password (never stored in plain text)

### Financial Data
- Trial balance entries (GL account balances)
- Account mappings and chart of accounts
- Financial statement structures
- Budgets, projections, and forecasts
- Company and division information

### Technical Data
- IP addresses (for rate limiting and security)
- Request logs (method, path, response code, duration)
- Authentication tokens (JWT)

## How We Use Your Data

### Primary Purposes
- Provide financial modeling and reporting services
- Authenticate users and secure access
- Generate financial statements and analysis

### Security Purposes
- Rate limiting to prevent abuse
- Logging for security monitoring
- Error tracking for service reliability

## Data Storage & Security

### Storage
- Data is stored in PostgreSQL databases
- All data is encrypted at rest
- Backups are encrypted and stored securely

### Security Measures
- Passwords hashed with bcrypt
- JWT tokens with expiration
- HTTPS encryption in transit
- Rate limiting on authentication endpoints
- Input validation on all user inputs

## Data Retention

### Active Accounts
- Account and financial data retained while account is active
- Access logs retained for 90 days
- Error logs retained for 30 days

### Deleted Accounts
- User data deleted within 30 days of account deletion request
- Anonymized aggregate data may be retained for analytics

## Data Sharing

We do not sell, trade, or share your personal or financial data with third parties except:
- When required by law
- With service providers who assist in operating our platform (under strict confidentiality)
- With your explicit consent

## Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Export your data
- Withdraw consent

## Multi-Tenancy

Modelisys is a multi-tenant platform:
- Each organization's data is logically isolated
- Users can only access data within their organization
- Organization admins control user access

## Cookies

We use essential cookies for:
- Authentication (httpOnly refresh token cookie)
- Session management

We do not use tracking or advertising cookies.

## Contact

For privacy-related inquiries:
- Email: privacy@modelisys.com

## Changes to This Policy

We may update this policy periodically. Users will be notified of significant changes via email or in-app notification.

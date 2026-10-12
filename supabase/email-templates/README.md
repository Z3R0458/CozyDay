# CozyDay Supabase Email Templates

Use `confirm-signup.html` for Supabase Auth confirmation emails.

## Supabase Setup

1. Open your Supabase project.
2. Go to `Authentication` > `Email Templates`.
3. Choose `Confirm signup`.
4. Subject:

```text
Confirm your CozyDay email
```

5. Paste the contents of `confirm-signup.html` into the message body.
6. Save.

The template uses Supabase's required `{{ .ConfirmationURL }}` variable for the confirmation link.

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseSitioHoy } from "@/lib/supabase-sitiohoy";
import { getSessionUser } from "@/lib/api";

const resend = new Resend(process.env.RESEND_API_KEY);

function buildResetEmail(name: string, resetUrl: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Restablecer contraseña</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0f172a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0f172a">
  <tr>
    <td align="center" style="padding:48px 16px;">

      <!-- Contenedor principal -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
            Sitio<span style="color:#10b981;">Hoy</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td bgcolor="#1e293b" style="background-color:#1e293b;border-radius:16px;border:1px solid #334155;padding:40px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

              <!-- Ícono -->
              <tr>
                <td align="center" style="padding-bottom:20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="60" height="60" align="center" valign="middle" bgcolor="#0d2e1e"
                          style="background-color:#0d2e1e;border-radius:14px;width:60px;height:60px;font-size:30px;line-height:60px;text-align:center;">
                        &#128274;
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Título -->
              <tr>
                <td align="center" style="padding-bottom:10px;">
                  <h1 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#f1f5f9;letter-spacing:-0.3px;">
                    Restablecer contrase&#241;a
                  </h1>
                </td>
              </tr>

              <!-- Cuerpo -->
              <tr>
                <td align="center" style="padding-bottom:32px;">
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#94a3b8;line-height:1.7;text-align:center;">
                    Hola <strong style="color:#e2e8f0;">${name}</strong>, recibimos una solicitud<br/>para restablecer la contrase&#241;a de tu cuenta en SitioHoy.
                  </p>
                </td>
              </tr>

              <!-- Botón -->
              <tr>
                <td align="center" style="padding-bottom:32px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="#10b981" style="background-color:#10b981;border-radius:10px;mso-padding-alt:0;">
                        <a href="${resetUrl}"
                           style="display:inline-block;background-color:#10b981;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;mso-padding-alt:14px 36px;-webkit-text-size-adjust:none;">
                          Crear nueva contrase&#241;a
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Separador -->
              <tr>
                <td style="border-top:1px solid #334155;padding-top:24px;padding-bottom:14px;">
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;line-height:1.6;">
                    Si no solicitaste este cambio, pod&#233;s ignorar este email. Tu contrase&#241;a actual seguir&#225; siendo la misma.
                  </p>
                </td>
              </tr>

              <!-- Link de respaldo -->
              <tr>
                <td>
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#475569;line-height:1.7;">
                    Si el bot&#243;n no funciona, copi&#225; este enlace en tu navegador:<br/>
                    <a href="${resetUrl}" style="color:#10b981;word-break:break-all;text-decoration:underline;">${resetUrl}</a>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#475569;line-height:1.6;">
            &copy; ${year} SitioHoy &middot; Este email fue enviado autom&#225;ticamente, por favor no respondas.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUser();
    const { id } = await params;

    const { data: ticket, error: ticketError } = await supabaseSitioHoy
      .from("contact_messages")
      .select("id, name, email, source")
      .eq("id", id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    if (ticket.source !== "password_reset_request") {
      return NextResponse.json({ error: "Este ticket no es una solicitud de cambio de contraseña" }, { status: 400 });
    }

    const { data: linkData, error: linkError } = await supabaseSitioHoy.auth.admin.generateLink({
      type: "recovery",
      email: ticket.email,
      options: {
        redirectTo: `${process.env.SITIOHOY_APP_URL}/auth/reset-password`,
      },
    });

    if (linkError || !linkData) {
      return NextResponse.json({ error: linkError?.message ?? "Error generando el link" }, { status: 500 });
    }

    const resetUrl = linkData.properties.action_link;

    const { error: emailError } = await resend.emails.send({
      from: "SitioHoy <no-reply@sitiohoy.com.ar>",
      to: ticket.email,
      subject: "Restablecer contraseña de SitioHoy",
      html: buildResetEmail(ticket.name, resetUrl),
    });

    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

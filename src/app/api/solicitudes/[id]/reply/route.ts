import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/api";
import { registrarAuditoria } from "@/lib/audit";

const resend = new Resend(process.env.RESEND_API_KEY);

function buildReplyEmail(contactName: string, originalMessage: string, replyBody: string): string {
  const year = new Date().getFullYear();
  const escapedOriginal = originalMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedReply = replyBody.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Respuesta de SitioHoy</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0f172a">
  <tr>
    <td align="center" style="padding:48px 16px;">
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
                        &#128140;
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Título -->
              <tr>
                <td align="center" style="padding-bottom:10px;">
                  <h1 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#f1f5f9;letter-spacing:-0.3px;">
                    Respuesta a tu consulta
                  </h1>
                </td>
              </tr>

              <!-- Saludo -->
              <tr>
                <td style="padding-bottom:24px;">
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#94a3b8;line-height:1.7;text-align:center;">
                    Hola <strong style="color:#e2e8f0;">${contactName}</strong>, el equipo de SitioHoy respondi&#243; tu consulta.
                  </p>
                </td>
              </tr>

              <!-- Respuesta -->
              <tr>
                <td bgcolor="#0f172a" style="background-color:#0f172a;border-radius:10px;border:1px solid #334155;padding:20px 24px;margin-bottom:24px;">
                  <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;color:#10b981;letter-spacing:0.06em;text-transform:uppercase;">
                    Respuesta del equipo
                  </p>
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#e2e8f0;line-height:1.7;">
                    ${escapedReply}
                  </p>
                </td>
              </tr>

              <!-- Espaciado -->
              <tr><td style="height:20px;"></td></tr>

              <!-- Separador + mensaje original -->
              <tr>
                <td style="border-top:1px solid #334155;padding-top:20px;">
                  <p style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.06em;text-transform:uppercase;">
                    Tu mensaje original
                  </p>
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;line-height:1.6;white-space:pre-wrap;">
                    ${escapedOriginal}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#475569;line-height:1.6;">
            &copy; ${year} SitioHoy &middot; Este email fue enviado como respuesta a tu consulta.
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const body = await request.json();
    const replyBody: string = (body?.message ?? "").trim();

    if (!replyBody) {
      return NextResponse.json({ error: "El mensaje de respuesta no puede estar vacío" }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select("id, name, email, message")
      .eq("id", id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    const { error: emailError } = await resend.emails.send({
      from: "SitioHoy <no-reply@sitiohoy.com.ar>",
      to: ticket.email,
      subject: "Respuesta a tu consulta — SitioHoy",
      html: buildReplyEmail(ticket.name, ticket.message, replyBody),
    });

    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    await registrarAuditoria({
      usuario_id: user.id,
      tabla_afectada: "tickets",
      registro_id: id,
      accion: "UPDATE",
      cambios_anteriores: null,
      cambios_nuevos: { reply_sent: true, reply_preview: replyBody.slice(0, 120) },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

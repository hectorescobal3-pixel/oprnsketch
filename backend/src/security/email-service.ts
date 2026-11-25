import nodemailer from 'nodemailer';

export interface PaymentInitiatedEmailParams {
  to: string;
  name?: string;
  planName: string;
  amountFormatted: string;
  checkoutUrl?: string | null;
}

export interface PaymentConfirmedEmailParams {
  to: string;
  name?: string;
  planName: string;
  isLifetime: boolean;
  nextBillingDate?: string | null;
}

export interface RenewalReminder3DaysEmailParams {
  to: string;
  name?: string;
  dueDate: string;
  checkoutUrl?: string | null;
}

export interface Overdue7DaysEmailParams {
  to: string;
  name?: string;
  dueDate: string;
  checkoutUrl?: string | null;
}

export interface CheckoutActivationEmailParams {
  to: string;
  name?: string;
  planName: string;
  isLifetime: boolean;
  activationUrl: string;
}

function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = process.env.SMTP_PASS || '';
  const from = (process.env.SMTP_FROM || user || 'ESCORP I.D.S. <escorpsystems@gmail.com>').trim();
  return { host, port, user, pass, from };
}

function formatDisplayDate(isoOrText?: string | null): string {
  if (!isoOrText) return '';
  const parsed = new Date(isoOrText);
  if (Number.isNaN(parsed.getTime())) return isoOrText;
  return parsed.toLocaleDateString('pt-BR');
}

async function dispatchEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ delivered: boolean; dryRun: boolean }> {
  const { host, port, user, pass, from } = getSmtpConfig();

  if (!host || !user) {
    console.info(`[EmailService:dry-run] to=${params.to} | subject="${params.subject}"`);
    return { delivered: false, dryRun: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  return { delivered: true, dryRun: false };
}

export async function sendPaymentInitiatedEmail(
  params: PaymentInitiatedEmailParams
): Promise<{ delivered: boolean; dryRun: boolean }> {
  const greeting = params.name?.trim() ? `Olá, ${params.name.trim()}` : 'Olá';
  const linkLine = params.checkoutUrl
    ? `Conclua seu pagamento pelo link seguro: ${params.checkoutUrl}`
    : 'Acesse sua conta no opensketch para concluir o pagamento.';
  const htmlLink = params.checkoutUrl
    ? `<p><a href="${params.checkoutUrl}" style="color:#2C4863;font-weight:700;">Concluir pagamento no PagBank</a></p>`
    : '';

  return dispatchEmail({
    to: params.to,
    subject: `opensketch • Pagamento iniciado (${params.planName})`,
    text: `${greeting},\n\nSeu checkout para o ${params.planName} (${params.amountFormatted}) foi iniciado no opensketch.\n${linkLine}\n\nEquipe opensketch • ESCORP I.D.S.`,
    html: `<p>${greeting},</p><p>Seu checkout para o <strong>${params.planName}</strong> (<strong>${params.amountFormatted}</strong>) foi iniciado no opensketch.</p>${htmlLink}<p>Equipe opensketch • ESCORP I.D.S.</p>`,
  });
}

export async function sendPaymentConfirmedEmail(
  params: PaymentConfirmedEmailParams
): Promise<{ delivered: boolean; dryRun: boolean }> {
  const greeting = params.name?.trim() ? `Olá, ${params.name.trim()}` : 'Olá';
  const appUrl = (process.env.APP_URL || 'https://opensketch-e7eb1.web.app').trim();
  const formattedNextBilling = formatDisplayDate(params.nextBillingDate);

  const subject = params.isLifetime
    ? 'Acesso liberado — Seu Plano Vitalício no opensketch já está ativo'
    : 'Acesso liberado — Seu Plano Mensal no opensketch já está ativo';

  const planDetailsText = params.isLifetime
    ? 'Seu pagamento único foi confirmado e o seu Plano Vitalício já está ativo, sem mensalidades e sem data de vencimento. Você tem acesso permanente ao opensketch, incluindo todas as futuras atualizações e melhorias da plataforma.'
    : `Sua assinatura do Plano Mensal já está ativa e válida por 30 dias.${
        formattedNextBilling ? ` A próxima renovação está prevista para ${formattedNextBilling}.` : ''
      } Para sua tranquilidade, enviaremos um lembrete por e-mail 3 dias antes do vencimento.`;

  const planDetailsHtml = params.isLifetime
    ? '<p>Seu pagamento único foi confirmado e o seu <strong>Plano Vitalício</strong> já está ativo, sem mensalidades e sem data de vencimento. Você tem acesso permanente ao opensketch, incluindo todas as futuras atualizações e melhorias da plataforma.</p>'
    : `<p>Sua assinatura do <strong>Plano Mensal</strong> já está ativa e válida por 30 dias.${
        formattedNextBilling
          ? ` A próxima renovação está prevista para <strong>${formattedNextBilling}</strong>.`
          : ''
      } Para sua tranquilidade, enviaremos um lembrete por e-mail 3 dias antes do vencimento.</p>`;

  const accessText = `Entre na plataforma usando a mesma conta utilizada na compra: ${appUrl}`;
  const closingText = 'Obrigado pela escolha. A ESCORP I.D.S. agradece a sua confiança.';

  const accessHtml = `<p>Entre na plataforma utilizando a mesma conta usada na compra:</p><p><a href="${appUrl}" style="display:inline-block;padding:12px 20px;background-color:#2C4863;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;">Acessar o opensketch</a></p><p style="font-size:13px;color:#475569;">Ou acesse pelo link direto: <a href="${appUrl}" style="color:#2C4863;">${appUrl}</a></p>`;
  const closingHtml = '<p style="margin-top:20px;"><strong>Obrigado pela escolha. A ESCORP I.D.S. agradece a sua confiança.</strong></p>';

  return dispatchEmail({
    to: params.to,
    subject,
    text: `${greeting},\n\n${planDetailsText}\n\n${accessText}\n\n${closingText}`,
    html: `<p>${greeting},</p>${planDetailsHtml}${accessHtml}${closingHtml}`,
  });
}

export async function sendRenewalReminder3DaysEmail(
  params: RenewalReminder3DaysEmailParams
): Promise<{ delivered: boolean; dryRun: boolean }> {
  const greeting = params.name?.trim() ? `Olá, ${params.name.trim()}` : 'Olá';
  const formattedDue = formatDisplayDate(params.dueDate);
  const appUrl = (process.env.APP_URL || 'https://opensketch-e7eb1.web.app').trim();
  const renewUrl = params.checkoutUrl || `${appUrl.replace(/\/$/, '')}/planos`;

  return dispatchEmail({
    to: params.to,
    subject: `Fique atento ao prazo da renovação da sua conta no opensketch (${formattedDue})`,
    text: `${greeting},\n\nFique atento ao prazo da renovação da sua conta no opensketch.\nSeu Plano Essencial Mensal vence em ${formattedDue} (daqui a 3 dias). Renove para manter todos os recursos ativos sem interrupção.\n\nAcesse para renovar: ${renewUrl}\nEntrar na plataforma: ${appUrl}\n\nEquipe opensketch • ESCORP I.D.S.`,
    html: `<p>${greeting},</p><p><strong>Fique atento ao prazo da renovação da sua conta no opensketch.</strong></p><p>Seu <strong>Plano Essencial Mensal</strong> vence em <strong>${formattedDue}</strong> (daqui a 3 dias). Renove para manter todos os recursos Pro ativos sem interrupção.</p><p><a href="${renewUrl}" style="display:inline-block;padding:12px 20px;background-color:#2C4863;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;">Renovar assinatura agora</a></p><p style="font-size:13px;color:#475569;">Ou acesse a plataforma: <a href="${appUrl}" style="color:#2C4863;">${appUrl}</a></p><p>Equipe opensketch • ESCORP I.D.S.</p>`,
  });
}

export async function sendOverdue7DaysEmail(
  params: Overdue7DaysEmailParams
): Promise<{ delivered: boolean; dryRun: boolean }> {
  const greeting = params.name?.trim() ? `Olá, ${params.name.trim()}` : 'Olá';
  const formattedDue = formatDisplayDate(params.dueDate);
  const appUrl = (process.env.APP_URL || 'https://opensketch-e7eb1.web.app').trim();
  const renewUrl = params.checkoutUrl || `${appUrl.replace(/\/$/, '')}/planos`;

  return dispatchEmail({
    to: params.to,
    subject: `opensketch • Renove sua conta (prazo vencido há 7 dias em ${formattedDue})`,
    text: `${greeting},\n\nIdentificamos que sua assinatura do Plano Mensal venceu em ${formattedDue} (há 7 dias). Para evitar o bloqueio dos recursos Pro, renove sua conta na plataforma opensketch.\n\nRecomendação importante: antes do bloqueio dos recursos Pro, acesse Configurações > "Baixar meus dados" dentro do opensketch para salvar uma cópia de backup dos seus registros.\n\nRenovar ou acessar agora: ${appUrl}\nPágina de planos: ${renewUrl}\n\nEquipe opensketch • ESCORP I.D.S.`,
    html: `<p>${greeting},</p><p>Identificamos que sua assinatura do <strong>Plano Mensal</strong> venceu em <strong>${formattedDue}</strong> (há 7 dias). Para evitar o bloqueio dos recursos Pro, renove sua conta na plataforma opensketch.</p><p style="padding:12px;background-color:#FFF7ED;border-left:4px solid #EA580C;color:#7C2D12;"><strong>Recomendação importante:</strong> antes do bloqueio dos recursos Pro, acesse <strong>Configurações &gt; "Baixar meus dados"</strong> no opensketch para salvar uma cópia de backup dos seus registros.</p><p><a href="${appUrl}" style="display:inline-block;padding:12px 20px;background-color:#EA580C;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;">Acessar e renovar no opensketch</a></p><p style="font-size:13px;color:#475569;">Link direto: <a href="${appUrl}" style="color:#2C4863;">${appUrl}</a></p><p>Equipe opensketch • ESCORP I.D.S.</p>`,
  });
}

export async function sendCheckoutActivationEmail(
  params: CheckoutActivationEmailParams
): Promise<{ delivered: boolean; dryRun: boolean }> {
  const greeting = params.name?.trim() ? `Olá, ${params.name.trim()}` : 'Olá';
  const planSummary = params.isLifetime
    ? 'Seu pagamento único para o Plano Completo Vitalício foi confirmado! Sem mensalidades e com todas as futuras atualizações incluídas.'
    : 'Seu pagamento para o Plano Essencial Mensal foi confirmado! Sua assinatura já está validada por 30 dias.';

  return dispatchEmail({
    to: params.to,
    subject: `opensketch • Pagamento confirmado! Crie sua senha para acessar (${params.planName})`,
    text: `${greeting},\n\n${planSummary}\n\nPara finalizar seu cadastro e liberar seu acesso imediatamente, crie sua senha pelo link exclusivo abaixo:\n${params.activationUrl}\n\nObrigado pela escolha. A ESCORP I.D.S. agradece a sua confiança.`,
    html: `<p>${greeting},</p><p>${planSummary}</p><p>Para finalizar seu cadastro e liberar seu acesso imediatamente, clique no botão abaixo para definir sua senha:</p><p><a href="${params.activationUrl}" style="display:inline-block;padding:12px 22px;background-color:#EA580C;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;">Criar Minha Senha e Acessar o opensketch</a></p><p style="font-size:13px;color:#475569;">Ou acesse pelo link direto: <a href="${params.activationUrl}" style="color:#2C4863;">${params.activationUrl}</a></p><p style="margin-top:20px;"><strong>Obrigado pela escolha. A ESCORP I.D.S. agradece a sua confiança.</strong></p>`,
  });
}

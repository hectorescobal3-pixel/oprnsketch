import React, { useState } from 'react';
import { WorkspaceContext } from '../components/HeaderNavigation';
import { AiConversationalService } from '../services/ai-conversational-service';

interface FinanceiroViewProps {
  context: WorkspaceContext;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({ context }) => {
  const isPersonalEnv = context.type === 'PERSONAL';

  // === Estado: Minha Empresa (CORPORATE) ===
  const [unitCost, setUnitCost] = useState<string>('0');
  const [taxPercent, setTaxPercent] = useState<string>('0');
  const [selectedTaxRegime, setSelectedTaxRegime] = useState<string | null>(null);
  const [commissionPercent, setCommissionPercent] = useState<string>('0');
  const [targetMarginPercent, setTargetMarginPercent] = useState<string>('0');
  const [currentPrice, setCurrentPrice] = useState<string>('0');
  const [requestedDiscount, setRequestedDiscount] = useState<string>('0');
  const [monthlyProfitGoal, setMonthlyProfitGoal] = useState<string>('0');

  // === Estado: Meu Trabalho (PERSONAL) ===
  const [saleTablePrice, setSaleTablePrice] = useState<string>('0');
  const [personalCommissionPct, setPersonalCommissionPct] = useState<string>('0');
  const [maxAuthorizedDiscountPct, setMaxAuthorizedDiscountPct] = useState<string>('0');
  const [clientRequestedDiscount, setClientRequestedDiscount] = useState<string>('0');
  const [monthlyCommissionGoal, setMonthlyCommissionGoal] = useState<string>('0');
  const [strategicSuggestion, setStrategicSuggestion] = useState<{
    suggestedDiscountReais: number;
    suggestedDiscountPct: number;
    suggestedPrice: number;
    preservedCommission: number;
    message: string;
  } | null>(null);

  // Consultoria IA (Mike • Finanças)
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiAgentBadge, setAiAgentBadge] = useState<string>('Mike • Finanças');
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  const taxRegimes = [
    { id: 'mei', label: 'MEI (0%)', rate: '0' },
    { id: 'simples', label: 'Simples Nacional (6%)', rate: '6' },
    { id: 'presumido', label: 'Lucro Presumido (13,33%)', rate: '13.33' },
    { id: 'real', label: 'Lucro Real (18,5%)', rate: '18.5' },
  ];

  // Cálculos: Minha Empresa
  const cost = Math.max(0, Number(unitCost) || 0);
  const tax = Math.max(0, Math.min(80, Number(taxPercent) || 0)) / 100;
  const comm = Math.max(0, Math.min(80, Number(commissionPercent) || 0)) / 100;
  const margin = Math.max(0, Math.min(90, Number(targetMarginPercent) || 0)) / 100;
  const price = Math.max(0, Number(currentPrice) || 0);
  const discount = Math.max(0, Number(requestedDiscount) || 0);
  const profitGoal = Math.max(0, Number(monthlyProfitGoal) || 0);

  const denominator = 1 - margin - tax - comm;
  const minSafePrice = denominator > 0.01 ? cost / denominator : 0;
  const priceAfterDiscount = Math.max(0, price - discount);
  const netProfitAtCurrent = price * (1 - tax - comm) - cost;
  const netProfitAfterDiscount = priceAfterDiscount * (1 - tax - comm) - cost;
  const maxSafeDiscountReais = Math.max(0, price - minSafePrice);
  const maxSafeDiscountPct = price > 0 ? (maxSafeDiscountReais / price) * 100 : 0;
  const isDiscountSafe = priceAfterDiscount >= minSafePrice && minSafePrice > 0;

  const requiredSalesForGoal = netProfitAtCurrent > 0 ? Math.ceil(profitGoal / netProfitAtCurrent) : 0;
  const requiredRevenueForGoal = requiredSalesForGoal * price;

  // Cálculos: Meu Trabalho (Comissão & Desconto Estratégico)
  const tablePrice = Math.max(0, Number(saleTablePrice) || 0);
  const sellerCommRate = Math.max(0, Math.min(100, Number(personalCommissionPct) || 0)) / 100;
  const maxAuthDiscRate = Math.max(0, Math.min(100, Number(maxAuthorizedDiscountPct) || 0)) / 100;
  const clientDiscReais = Math.max(0, Number(clientRequestedDiscount) || 0);
  const commGoal = Math.max(0, Number(monthlyCommissionGoal) || 0);

  const minAuthorizedClosingPrice = tablePrice * (1 - maxAuthDiscRate);
  const grossCommission = tablePrice * sellerCommRate;
  const finalClosingPrice = Math.max(0, tablePrice - clientDiscReais);
  const netCommissionAfterDiscount = finalClosingPrice * sellerCommRate;
  const maxAllowedDiscountReais = tablePrice * maxAuthDiscRate;
  const remainingMarginReais = Math.max(0, finalClosingPrice - minAuthorizedClosingPrice);
  const remainingMarginPct = tablePrice > 0 ? (remainingMarginReais / tablePrice) * 100 : 0;
  const isPersonalDiscountAuthorized = finalClosingPrice >= minAuthorizedClosingPrice && tablePrice > 0;
  const salesNeededForCommissionGoal =
    netCommissionAfterDiscount > 0 ? Math.ceil(commGoal / netCommissionAfterDiscount) : 0;

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCalculateStrategicDiscount = () => {
    if (tablePrice <= 0) {
      setStrategicSuggestion({
        suggestedDiscountReais: 0,
        suggestedDiscountPct: 0,
        suggestedPrice: 0,
        preservedCommission: 0,
        message: 'Informe o Valor da Venda / Tabela (R$) para gerar a sugestão estratégica de fechamento.',
      });
      return;
    }

    // Estratégia: se o cliente pediu acima do teto, ancora na metade da margem autorizada ou no teto seguro;
    // se pediu dentro ou nada, oferece no máximo 40% da folga autorizada para fechar rápido preservando comissão.
    const anchorTargetReais =
      clientDiscReais > maxAllowedDiscountReais
        ? maxAllowedDiscountReais * 0.75
        : clientDiscReais > 0
        ? Math.min(clientDiscReais * 0.6, maxAllowedDiscountReais)
        : maxAllowedDiscountReais * 0.4;

    const suggestedDiscReais = Math.max(0, Number(anchorTargetReais.toFixed(2)));
    const suggestedDiscPct = tablePrice > 0 ? (suggestedDiscReais / tablePrice) * 100 : 0;
    const suggestedFinalPrice = Math.max(minAuthorizedClosingPrice, tablePrice - suggestedDiscReais);
    const preservedComm = suggestedFinalPrice * sellerCommRate;
    const savedComparedToFloor = preservedComm - minAuthorizedClosingPrice * sellerCommRate;

    const msg =
      maxAuthDiscRate <= 0
        ? `Mantenha o preço cheio de ${formatBRL(tablePrice)} (0% de desconto autorizado) e use prazo ou bônus de atendimento para fechar preservando ${formatBRL(grossCommission)} de comissão.`
        : `Ofereça um desconto estratégico de ${formatBRL(suggestedDiscReais)} (${suggestedDiscPct.toFixed(1)}%), fechando em ${formatBRL(suggestedFinalPrice)}. Assim você atende o cliente dentro da alçada, garante ${formatBRL(preservedComm)} de comissão líquida e preserva ${formatBRL(Math.max(0, savedComparedToFloor))} extras acima do piso mínimo.`;

    setStrategicSuggestion({
      suggestedDiscountReais: suggestedDiscReais,
      suggestedDiscountPct: suggestedDiscPct,
      suggestedPrice: suggestedFinalPrice,
      preservedCommission: preservedComm,
      message: msg,
    });
  };

  const handleAskMike = async (customPrompt?: string) => {
    setIsLoadingAi(true);
    try {
      const promptToSend =
        customPrompt ||
        (isPersonalEnv
          ? `Mike • Finanças, analise minha negociação no ambiente Meu Trabalho: valor de tabela ${formatBRL(tablePrice)}, minha comissão ${personalCommissionPct}%, desconto máximo autorizado ${maxAuthorizedDiscountPct}%, desconto pedido pelo cliente ${formatBRL(clientDiscReais)} e meta mensal de comissão ${formatBRL(commGoal)}. Comissão líquida após desconto está em ${formatBRL(netCommissionAfterDiscount)}. Como fechar sem queimar minha comissão?`
          : `Mike • Finanças, analise meu cenário atual: custo R$ ${cost.toFixed(2)}, impostos ${taxPercent}%, comissão ${commissionPercent}%, margem alvo ${targetMarginPercent}%, preço atual R$ ${price.toFixed(2)} e pedido de desconto de R$ ${discount.toFixed(2)}. Preço mínimo calculado é ${formatBRL(minSafePrice)}. Qual sua recomendação financeira e comercial?`);

      const res = await AiConversationalService.generateResponse(promptToSend, context.type, []);
      setAiResponse(res.text);
      if (res.agentUsed?.badge) {
        setAiAgentBadge(res.agentUsed.badge);
      }
    } finally {
      setIsLoadingAi(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1C1E22',
    border: '1px solid #272C34',
    borderRadius: '14px',
    padding: '22px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #2C333D',
    backgroundColor: '#121417',
    color: '#F8FAFC',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div
      style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        backgroundColor: '#121417',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>
            {isPersonalEnv
              ? '💼 Simulador de Comissão, Meta & Desconto Estratégico'
              : '📊 Centro de Inteligência Financeira & Margem'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8' }}>
            {isPersonalEnv
              ? 'Calcule sua comissão líquida, defina descontos estratégicos de fechamento e acompanhe sua meta mensal.'
              : 'Simule preço mínimo, margem líquida, limite seguro de desconto e metas com apoio direto do Mike • Finanças.'}
          </p>
        </div>
        <span
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            backgroundColor: 'rgba(59, 91, 120, 0.25)',
            border: '1px solid #4A7296',
            fontSize: '12px',
            fontWeight: 700,
            color: '#F8FAFC',
          }}
        >
          {isPersonalEnv ? 'Ambiente: Meu Trabalho' : 'Plano Completo Vitalício Ativo'}
        </span>
      </div>

      {/* Grid Principal: Calculadora + Resultados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '18px' }}>
        {isPersonalEnv ? (
          <>
            {/* Parâmetros: Meu Trabalho */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>
                Parâmetros da Negociação & Comissão
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Valor da Venda / Tabela (R$)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 5000"
                    value={saleTablePrice}
                    onChange={(e) => setSaleTablePrice(e.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Sua Comissão (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="Ex: 10"
                    value={personalCommissionPct}
                    onChange={(e) => setPersonalCommissionPct(e.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Desconto Máximo Autorizado (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="Ex: 15"
                    value={maxAuthorizedDiscountPct}
                    onChange={(e) => setMaxAuthorizedDiscountPct(e.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Desconto Pedido pelo Cliente (R$)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 300"
                    value={clientRequestedDiscount}
                    onChange={(e) => setClientRequestedDiscount(e.target.value)}
                    style={inputStyle}
                  />
                </label>
              </div>
            </div>

            {/* Diagnóstico em Tempo Real: Meu Trabalho */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>
                Diagnóstico de Fechamento & Comissão
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ backgroundColor: '#121417', border: '1px solid #272C34', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Preço Mínimo de Fechamento Autorizado (R$)</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#F8FAFC', marginTop: '4px' }}>
                    {formatBRL(minAuthorizedClosingPrice)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#121417', border: '1px solid #272C34', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Sua Comissão Bruta (R$)</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
                    {formatBRL(grossCommission)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#121417', border: '1px solid #272C34', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Sua Comissão Líquida Após Desconto (R$)</div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: netCommissionAfterDiscount > 0 ? '#10B981' : '#94A3B8',
                      marginTop: '4px',
                    }}
                  >
                    {formatBRL(netCommissionAfterDiscount)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#121417', border: '1px solid #272C34', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Margem de Negociação Restante (R$ e %)</div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: isPersonalDiscountAuthorized ? '#4A7296' : '#EF4444',
                      marginTop: '4px',
                    }}
                  >
                    {formatBRL(remainingMarginReais)} ({remainingMarginPct.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCalculateStrategicDiscount}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1px solid #4A7296',
                  backgroundColor: '#2C4863',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                Calcular Desconto Estratégico de Fechamento
              </button>

              {strategicSuggestion && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.45)',
                    color: '#D1FAE5',
                    fontSize: '13px',
                    lineHeight: 1.55,
                    marginBottom: '12px',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '4px', color: '#6EE7B7' }}>
                    Sugestão Estratégica de Fechamento
                  </strong>
                  {strategicSuggestion.message}
                </div>
              )}

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  backgroundColor:
                    tablePrice === 0
                      ? 'rgba(59, 91, 120, 0.14)'
                      : isPersonalDiscountAuthorized
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(239, 68, 68, 0.14)',
                  border:
                    tablePrice === 0
                      ? '1px solid #3B5B78'
                      : isPersonalDiscountAuthorized
                      ? '1px solid #10B981'
                      : '1px solid #EF4444',
                  color:
                    tablePrice === 0
                      ? '#CBD5E1'
                      : isPersonalDiscountAuthorized
                      ? '#A7F3D0'
                      : '#FECACA',
                }}
              >
                {tablePrice === 0
                  ? 'Informe o valor da venda, sua comissão e o teto de desconto autorizado para simular o fechamento.'
                  : isPersonalDiscountAuthorized
                  ? `✓ Negociação dentro da alçada: fechando em ${formatBRL(finalClosingPrice)}, sua comissão líquida fica em ${formatBRL(netCommissionAfterDiscount)}.`
                  : `⚠️ Atenção: o desconto pedido (${formatBRL(clientDiscReais)}) deixa o valor em ${formatBRL(finalClosingPrice)}, abaixo do mínimo autorizado (${formatBRL(minAuthorizedClosingPrice)}).`}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Parâmetros: Minha Empresa */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>
                Estrutura de Custos & Preço
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Custo Direto (R$)
                  <input type="number" min="0" step="0.01" placeholder="Ex: 450" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} style={inputStyle} />
                </label>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Preço Atual (R$)
                  <input type="number" min="0" step="0.01" placeholder="Ex: 850" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} style={inputStyle} />
                </label>

                {/* Botões de Regime Tributário logo acima de Impostos (%) */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {taxRegimes.map((regime) => {
                    const isSelected = selectedTaxRegime === regime.id || taxPercent === regime.rate;
                    return (
                      <button
                        key={regime.id}
                        type="button"
                        onClick={() => {
                          setSelectedTaxRegime(regime.id);
                          setTaxPercent(regime.rate);
                        }}
                        style={{
                          padding: '7px 11px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #60A5FA' : '1px solid #2C333D',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.22)' : '#121417',
                          color: isSelected ? '#F8FAFC' : '#94A3B8',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {regime.label}
                      </button>
                    );
                  })}
                </div>

                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Impostos (%)
                  <input
                    type="number"
                    min="0"
                    max="80"
                    step="0.01"
                    placeholder="Ex: 8"
                    value={taxPercent}
                    onChange={(e) => {
                      setTaxPercent(e.target.value);
                      setSelectedTaxRegime(null);
                    }}
                    style={inputStyle}
                  />
                </label>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Comissão / Taxas (%)
                  <input type="number" min="0" max="80" step="0.5" placeholder="Ex: 5" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} style={inputStyle} />
                </label>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Margem Desejada (%)
                  <input type="number" min="0" max="90" step="0.5" placeholder="Ex: 25" value={targetMarginPercent} onChange={(e) => setTargetMarginPercent(e.target.value)} style={inputStyle} />
                </label>
                <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Desconto Pedido (R$)
                  <input type="number" min="0" step="0.01" placeholder="Ex: 100" value={requestedDiscount} onChange={(e) => setRequestedDiscount(e.target.value)} style={inputStyle} />
                </label>
              </div>
            </div>

            {/* Diagnóstico em Tempo Real: Minha Empresa */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>
                Diagnóstico de Margem & Desconto
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ backgroundColor: '#121417', border: '1px solid #272C34', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Preço Mínimo Seguro</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#F8FAFC', marginTop: '4px' }}>
                    {denominator > 0.01 ? formatBRL(minSafePrice) : 'Inválido (>100%)'}
                  </div>
                </div>
                <div style={{ backgroundColor: '#121417', border: '1px solid #272C34', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Desconto Máximo Seguro</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#4A7296', marginTop: '4px' }}>
                    {formatBRL(maxSafeDiscountReais)} ({maxSafeDiscountPct.toFixed(1)}%)
                  </div>
                </div>
                <div style={{ backgroundColor: '#121417', border: '1px solid #272C34', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Lucro Líquido Atual</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: netProfitAtCurrent >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                    {formatBRL(netProfitAtCurrent)}
                  </div>
                </div>
                <div style={{ backgroundColor: '#121417', border: '1px solid #272C34', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Lucro Após Desconto</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: netProfitAfterDiscount >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                    {formatBRL(netProfitAfterDiscount)}
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  backgroundColor:
                    price === 0 && cost === 0
                      ? 'rgba(59, 91, 120, 0.14)'
                      : isDiscountSafe
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(239, 68, 68, 0.14)',
                  border:
                    price === 0 && cost === 0
                      ? '1px solid #3B5B78'
                      : isDiscountSafe
                      ? '1px solid #10B981'
                      : '1px solid #EF4444',
                  color:
                    price === 0 && cost === 0
                      ? '#CBD5E1'
                      : isDiscountSafe
                      ? '#A7F3D0'
                      : '#FECACA',
                }}
              >
                {price === 0 && cost === 0
                  ? 'Informe os custos e o preço atual da sua empresa para calcular a margem e o limite seguro de desconto.'
                  : isDiscountSafe
                  ? `✓ O desconto de ${formatBRL(discount)} mantém o preço final (${formatBRL(priceAfterDiscount)}) acima do mínimo seguro.`
                  : `⚠️ Atenção: o desconto de ${formatBRL(discount)} reduz o preço para ${formatBRL(priceAfterDiscount)}, abaixo do mínimo seguro (${formatBRL(minSafePrice)}).`}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Simulador de Meta + Consultoria Mike • Finanças */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '18px' }}>
        {isPersonalEnv ? (
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700 }}>
              Simulador de Meta de Comissão Mensal
            </h2>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              Meta de Comissão Líquida no Mês (R$)
              <input
                type="number"
                min="0"
                step="100"
                placeholder="Ex: 8000"
                value={monthlyCommissionGoal}
                onChange={(e) => setMonthlyCommissionGoal(e.target.value)}
                style={inputStyle}
              />
            </label>
            <div style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: 1.7 }}>
              <div>
                Vendas necessárias para bater a meta:{' '}
                <strong style={{ color: '#F8FAFC' }}>{salesNeededForCommissionGoal} venda(s)</strong>
              </div>
              <div>
                Volume total em vendas necessário:{' '}
                <strong style={{ color: '#4A7296' }}>
                  {formatBRL(salesNeededForCommissionGoal * finalClosingPrice)}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700 }}>
              Simulador de Meta de Lucro Mensal
            </h2>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              Meta de Lucro Líquido no Mês (R$)
              <input type="number" min="0" step="100" placeholder="Ex: 15000" value={monthlyProfitGoal} onChange={(e) => setMonthlyProfitGoal(e.target.value)} style={inputStyle} />
            </label>
            <div style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: 1.7 }}>
              <div>
                Vendas necessárias no mês:{' '}
                <strong style={{ color: '#F8FAFC' }}>{requiredSalesForGoal} venda(s)</strong>
              </div>
              <div>
                Faturamento bruto necessário:{' '}
                <strong style={{ color: '#4A7296' }}>{formatBRL(requiredRevenueForGoal)}</strong>
              </div>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 700 }}>
            Consultoria IA ({aiAgentBadge})
          </h2>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94A3B8' }}>
            Envie seus números calculados para o Mike • Finanças avaliar margem, precificação e meta.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Pergunta opcional (ex: como defender esse preço sem dar desconto?)"
              style={{ ...inputStyle, flex: '1 1 220px' }}
            />
            <button
              type="button"
              disabled={isLoadingAi}
              onClick={() => handleAskMike(aiQuestion.trim() || undefined)}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #4A7296',
                backgroundColor: '#2C4863',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: isLoadingAi ? 'wait' : 'pointer',
              }}
            >
              {isLoadingAi ? 'Analisando...' : 'Analisar com Mike • Finanças'}
            </button>
          </div>
          {aiResponse && (
            <div
              style={{
                backgroundColor: '#121417',
                border: '1px solid #3B5B78',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#E2E8F0',
                whiteSpace: 'pre-wrap',
              }}
            >
              {aiResponse}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

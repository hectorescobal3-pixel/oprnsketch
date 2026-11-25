import React, { useState, useEffect } from 'react';
import { WorkspaceContext } from '../components/HeaderNavigation';
import { AppStorage, MetasData } from '../services/app-storage';

interface MetasObjetivosViewProps {
  context: WorkspaceContext;
}

export const MetasObjetivosView: React.FC<MetasObjetivosViewProps> = ({ context }) => {
  const [metas, setMetas] = useState<MetasData | null>(null);

  // Active hover states for interactive tooltips
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(null);
  const [isBarHovered, setIsBarHovered] = useState(false);
  const [barHoverPos, setBarHoverPos] = useState({ x: 0, percent: 0 });

  // Modal State: "Lançar Progresso" (when 0%) or "Ajustar Progresso" (when > 0%)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formProgress, setFormProgress] = useState<number>(0);
  const [formTitle, setFormTitle] = useState('Meta Geral de Atividades');
  const [formCycle, setFormCycle] = useState('Ciclo Q4 2026');
  const [formDeadline, setFormDeadline] = useState('31/12/2026');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const loaded = AppStorage.getMetas(context.type);
    setMetas(loaded);
    setFormProgress(loaded.realizadoTotal);
    setFormTitle(loaded.goalTitle || 'Meta Geral de Atividades');
    setFormCycle(loaded.cycleName || 'Ciclo Q4 2026');
    setFormDeadline(loaded.deadline || '31/12/2026');
  }, [context.type]);

  if (!metas) return null;

  // Calculate percentage: normalized between 0 and 100
  const progressPercent = Math.min(100, Math.max(0, Math.round((metas.realizadoTotal / (metas.metaTotal || 100)) * 100)));

  // Generates SVG Donut paths dynamically based on exact data
  let accumulatedAngle = 0;
  const radius = 70;
  const center = 100;

  const donutSlices = metas.distribution.map((item, index) => {
    const angle = (item.percentage / 100) * 360;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angle;
    accumulatedAngle += angle;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return {
      ...item,
      pathData,
      index,
    };
  });

  const handleOpenModal = () => {
    setFormProgress(progressPercent);
    setFormTitle(metas.goalTitle || 'Meta Geral de Atividades');
    setFormCycle(metas.cycleName);
    setFormDeadline(metas.deadline);
    setIsModalOpen(true);
  };

  const handleSaveProgress = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = AppStorage.updateProgress(
      context.type,
      formProgress,
      formTitle,
      formCycle,
      formDeadline
    );
    setMetas(updated);
    setIsModalOpen(false);
    showToast(formProgress === 0 ? 'Progresso redefinido para 0%.' : `Progresso atualizado para ${formProgress}% com sucesso!`);
  };

  const handleResetToZero = () => {
    const updated = AppStorage.resetProgress(context.type);
    setMetas(updated);
    setFormProgress(0);
    setIsModalOpen(false);
    showToast('Painel zerado (0%). Agora o botão "Lançar" está disponível!');
  };

  const handleBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = Math.round((relX / rect.width) * 100);
    setBarHoverPos({ x: relX, percent: pct });
  };

  const activeHoveredSlice = hoveredSliceIndex !== null ? donutSlices[hoveredSliceIndex] : null;

  return (
    <div className="responsive-view-container" style={{ flex: 1, overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            backgroundColor: '#1C1E22',
            border: '1px solid #10B981',
            borderRadius: '10px',
            padding: '14px 20px',
            color: '#D9DEE4',
            fontSize: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ color: '#10B981', fontSize: '18px' }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          borderBottom: '1px solid #1C1E22',
          paddingBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#D9DEE4' }}>
              Progresso e Metas do Trabalho
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: context.type === 'CORPORATE' ? '#3D5A73' : '#8A96A3',
                backgroundColor: '#1C1E22',
                border: '1px solid #272C34',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {metas.cycleName}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#8A96A3' }}>
            Acompanhamento universal das etapas de trabalho e metas com recálculo visual em tempo real.
          </p>
        </div>

        {/* ================= CONDITIONAL BUTTONS: LANÇAR (0%) VS AJUSTAR (>0%) ================= */}
        <div>
          {progressPercent === 0 ? (
            <button
              onClick={handleOpenModal}
              title="Iniciar acompanhamento de progresso"
              style={{
                padding: '12px 22px',
                backgroundColor: '#3D5A73',
                border: 'none',
                color: '#D9DEE4',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(61,90,115,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 700 }}>+</span> Lançar Progresso
            </button>
          ) : (
            <button
              onClick={handleOpenModal}
              title="Ajustar ou atualizar o progresso do trabalho"
              style={{
                padding: '12px 20px',
                backgroundColor: '#1C1E22',
                border: '1px solid #3D5A73',
                color: '#D9DEE4',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#272C34';
                e.currentTarget.style.borderColor = '#4A6D8C';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1C1E22';
                e.currentTarget.style.borderColor = '#3D5A73';
              }}
            >
              <span>⚙️</span> Ajustar Progresso
            </button>
          )}
        </div>
      </div>

      {/* Main Target Hero Card */}
      <div
        style={{
          backgroundColor: '#1C1E22',
          border: '1px solid #272C34',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '24px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#8A96A3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Objetivo Ativo ({context.type === 'CORPORATE' ? 'Minha Empresa' : 'Meu Trabalho'})
            </span>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#D9DEE4', margin: '4px 0' }}>
              {metas.goalTitle || 'Meta Geral de Atividades'}
            </div>
            <div style={{ fontSize: '14px', color: '#8A96A3' }}>
              Prazo de Conclusão: <strong style={{ color: '#D9DEE4' }}>{metas.deadline}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: progressPercent >= 100 ? '#10B981' : progressPercent > 0 ? '#3D5A73' : '#8A96A3',
              }}
            >
              {progressPercent}%
            </span>
            <div style={{ fontSize: '12px', color: '#8A96A3' }}>
              {progressPercent >= 100
                ? 'Concluído com Sucesso 🎉'
                : progressPercent === 0
                ? 'Aguardando Lançamento'
                : 'Etapas Concluídas'}
            </div>
          </div>
        </div>

        {/* Interactive Progress Bar with Floating Tooltip */}
        <div style={{ position: 'relative', marginTop: '16px', marginBottom: '8px' }}>
          {/* Tooltip on Hover */}
          {isBarHovered && (
            <div
              style={{
                position: 'absolute',
                top: '-42px',
                left: `${Math.min(90, Math.max(10, (barHoverPos.x / 600) * 100))}%`,
                transform: 'translateX(-50%)',
                backgroundColor: '#121417',
                border: '1px solid #3D5A73',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                color: '#D9DEE4',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 10,
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
              }}
            >
              <strong style={{ color: '#10B981' }}>{progressPercent}% concluído</strong>
              {progressPercent < 100
                ? ` • Faltam ${100 - progressPercent}% para finalizar`
                : ' • Todas as etapas concluídas!'}
            </div>
          )}

          <div
            onMouseEnter={() => setIsBarHovered(true)}
            onMouseLeave={() => setIsBarHovered(false)}
            onMouseMove={handleBarMouseMove}
            style={{
              width: '100%',
              height: '16px',
              backgroundColor: '#121417',
              borderRadius: '8px',
              overflow: 'hidden',
              border: isBarHovered ? '1px solid #4A6D8C' : '1px solid #272C34',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background:
                  progressPercent >= 100
                    ? 'linear-gradient(90deg, #3D5A73 0%, #10B981 100%)'
                    : 'linear-gradient(90deg, #2C4257 0%, #3D5A73 60%, #4A6D8C 100%)',
                borderRadius: '8px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#8A96A3' }}>
          <span>
            {progressPercent === 0
              ? 'Nenhuma etapa lançada ainda. Clique em "+ Lançar Progresso" acima para começar.'
              : progressPercent >= 100
              ? '🎉 Parabéns! Todas as etapas deste período foram 100% cumpridas.'
              : `Etapas em andamento: ${progressPercent}% concluído (${100 - progressPercent}% restantes).`}
          </span>
          <span style={{ fontWeight: 500 }}>Meta: 100% das etapas</span>
        </div>
      </div>

      {/* Distribution Section: Real SVG Donut Chart + Interactive Category Tooltips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {/* Donut Chart Card */}
        <div
          style={{
            backgroundColor: '#1C1E22',
            border: '1px solid #272C34',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#D9DEE4' }}>
              Divisão de Etapas do Trabalho
            </h3>
            <span style={{ fontSize: '12px', color: '#8A96A3' }}>Passe o cursor para detalhes</span>
          </div>

          <div style={{ position: 'relative', width: '220px', height: '220px', margin: '16px 0' }}>
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              {donutSlices.map((slice) => {
                const isHovered = hoveredSliceIndex === slice.index;
                return (
                  <path
                    key={slice.index}
                    d={slice.pathData}
                    fill={slice.color}
                    stroke={isHovered ? '#FFFFFF' : '#1C1E22'}
                    strokeWidth={isHovered ? '3.5' : '2'}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      filter: isHovered ? 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' : 'none',
                    }}
                    onMouseEnter={() => setHoveredSliceIndex(slice.index)}
                    onMouseLeave={() => setHoveredSliceIndex(null)}
                  />
                );
              })}
              {/* Inner Hole for Donut Look */}
              <circle cx="100" cy="100" r="48" fill="#1C1E22" />
            </svg>

            {/* Inner Center Label: Live Dynamic Feedback */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                textAlign: 'center',
                padding: '10px',
              }}
            >
              {activeHoveredSlice ? (
                <>
                  <span style={{ fontSize: '11px', color: activeHoveredSlice.color, fontWeight: 600 }}>
                    {activeHoveredSlice.percentage}%
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#D9DEE4',
                      fontWeight: 500,
                      maxWidth: '85px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {activeHoveredSlice.label.split(' ')[0]}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '11px', color: '#8A96A3' }}>Conclusão</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#D9DEE4' }}>
                    {progressPercent}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Slice Tooltip Banner below chart */}
          <div
            style={{
              width: '100%',
              minHeight: '44px',
              backgroundColor: '#121417',
              border: '1px solid #272C34',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              marginTop: '4px',
            }}
          >
            {activeHoveredSlice ? (
              <div style={{ fontSize: '12px', color: '#D9DEE4' }}>
                <strong style={{ color: activeHoveredSlice.color }}>{activeHoveredSlice.label}:</strong>{' '}
                <span style={{ color: '#8A96A3' }}>{activeHoveredSlice.description}</span>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: '#8A96A3', fontStyle: 'italic' }}>
                💡 Passe o cursor sobre o gráfico ou lista para visualizar os detalhes de cada etapa.
              </span>
            )}
          </div>
        </div>

        {/* Legend & Breakdown List with Interactive Hover */}
        <div
          style={{
            backgroundColor: '#1C1E22',
            border: '1px solid #272C34',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: '#D9DEE4' }}>
              Etapas e Áreas de Atuação
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#8A96A3' }}>
              Detalhamento de cada etapa do trabalho e peso proporcional na meta total.
            </p>
          </div>

          {metas.distribution.map((item, idx) => {
            const isHovered = hoveredSliceIndex === idx;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredSliceIndex(idx)}
                onMouseLeave={() => setHoveredSliceIndex(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '12px 14px',
                  backgroundColor: isHovered ? '#1E232B' : '#121417',
                  borderRadius: '10px',
                  border: isHovered ? `1px solid ${item.color}` : '1px solid #272C34',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isHovered ? `0 2px 10px rgba(0,0,0,0.4)` : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        backgroundColor: item.color,
                        boxShadow: isHovered ? `0 0 8px ${item.color}` : 'none',
                      }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#D9DEE4' }}>
                      {item.label}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: item.color,
                      backgroundColor: '#1C1E22',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #272C34',
                    }}
                  >
                    {item.percentage}%
                  </span>
                </div>

                {item.description && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#8A96A3', paddingLeft: '22px' }}>
                    {item.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MODAL ÚNICO E DINÂMICO (LANÇAR OU AJUSTAR) ================= */}
      {isModalOpen && (
        <div style={modalBackdropStyle} onClick={() => setIsModalOpen(false)}>
          <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#D9DEE4' }}>
                {progressPercent === 0 ? 'Lançar Progresso do Trabalho' : 'Ajustar Progresso do Trabalho'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8A96A3',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#8A96A3', lineHeight: '1.4' }}>
              {progressPercent === 0
                ? 'Defina a porcentagem atual de conclusão e o objetivo para dar início ao acompanhamento.'
                : 'Atualize o andamento do seu trabalho. Você também pode zerar o painel para testar o estado inicial.'}
            </p>

            <form onSubmit={handleSaveProgress}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Porcentagem Input + Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={modalLabelStyle}>Progresso Concluído (%)</label>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
                      {formProgress}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formProgress}
                    onChange={(e) => setFormProgress(Number(e.target.value))}
                    style={{
                      width: '100%',
                      cursor: 'pointer',
                      accentColor: '#3D5A73',
                      marginBottom: '8px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[0, 25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormProgress(preset)}
                        style={{
                          flex: 1,
                          padding: '4px 0',
                          backgroundColor: formProgress === preset ? '#3D5A73' : '#121417',
                          border: '1px solid #272C34',
                          color: '#D9DEE4',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Título do Objetivo */}
                <div>
                  <label style={modalLabelStyle}>Título do Objetivo / Meta</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Entregas do Trimestre, Atendimentos aos Clientes"
                    style={modalInputStyle}
                  />
                </div>

                {/* Nome do Ciclo */}
                <div>
                  <label style={modalLabelStyle}>Período ou Ciclo</label>
                  <input
                    type="text"
                    required
                    value={formCycle}
                    onChange={(e) => setFormCycle(e.target.value)}
                    placeholder="Ex: Ciclo Q4 2026, Novembro 2026"
                    style={modalInputStyle}
                  />
                </div>

                {/* Data Limite */}
                <div>
                  <label style={modalLabelStyle}>Prazo Estimado</label>
                  <input
                    type="text"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    placeholder="Ex: 31/12/2026"
                    style={modalInputStyle}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #272C34',
                }}
              >
                {progressPercent > 0 ? (
                  <button
                    type="button"
                    onClick={handleResetToZero}
                    title="Redefinir para 0% para testar a aparição do botão Lançar"
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'transparent',
                      border: '1px dashed #F59E0B',
                      color: '#F59E0B',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Zerar Progresso (0%)
                  </button>
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={modalCancelButtonStyle}
                  >
                    Cancelar
                  </button>
                  <button type="submit" style={modalSubmitButtonStyle}>
                    {progressPercent === 0 ? 'Salvar e Lançar' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalBoxStyle: React.CSSProperties = {
  backgroundColor: '#1C1E22',
  border: '1px solid #3D5A73',
  borderRadius: '16px',
  padding: '28px',
  maxWidth: '480px',
  width: '100%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
};

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  color: '#8A96A3',
  marginBottom: '6px',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#121417',
  border: '1px solid #272C34',
  borderRadius: '6px',
  color: '#D9DEE4',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const modalCancelButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  backgroundColor: 'transparent',
  border: '1px solid #272C34',
  color: '#8A96A3',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
};

const modalSubmitButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#3D5A73',
  border: 'none',
  color: '#D9DEE4',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 0 12px rgba(61,90,115,0.3)',
};

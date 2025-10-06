import React, { useState, useEffect } from 'react';
import { dashboardFinanceiroAPI } from '../../utils/api';
import { FaMoneyBillWave, FaArrowUp, FaArrowDown, FaWallet, FaExclamationTriangle } from 'react-icons/fa';
import './DashboardFinanceiro.css';

const DashboardFinanceiro = () => {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const response = await dashboardFinanceiroAPI.obterDados();
            setDados(response.data);
            setErro(null);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            setErro('Erro ao carregar dados do dashboard');
        } finally {
            setLoading(false);
        }
    };

    const formatarMoeda = (valor) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    };

    if (loading) {
        return (
            <div className="dashboard-financeiro">
                <div className="loading">Carregando dashboard...</div>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="dashboard-financeiro">
                <div className="erro">{erro}</div>
            </div>
        );
    }

    const { resumo, contas_pagar, contas_receber, contas_bancarias, alertas, fluxo_caixa, por_categoria } = dados;

    return (
        <div className="dashboard-financeiro">
            <h1>Dashboard Financeiro</h1>

            {/* Cards de Resumo */}
            <div className="cards-resumo">
                <div className="card card-saldo">
                    <div className="card-icon">
                        <FaWallet />
                    </div>
                    <div className="card-content">
                        <h3>Saldo Total</h3>
                        <p className="valor">{formatarMoeda(resumo.saldo_total)}</p>
                        <small>Saldo projetado: {formatarMoeda(resumo.saldo_projetado)}</small>
                    </div>
                </div>

                <div className="card card-receber">
                    <div className="card-icon">
                        <FaArrowUp />
                    </div>
                    <div className="card-content">
                        <h3>A Receber</h3>
                        <p className="valor">{formatarMoeda(resumo.total_a_receber)}</p>
                        <small>{contas_receber.total} conta(s) pendente(s)</small>
                    </div>
                </div>

                <div className="card card-pagar">
                    <div className="card-icon">
                        <FaArrowDown />
                    </div>
                    <div className="card-content">
                        <h3>A Pagar</h3>
                        <p className="valor">{formatarMoeda(resumo.total_a_pagar)}</p>
                        <small>{contas_pagar.total} conta(s) pendente(s)</small>
                    </div>
                </div>

                <div className={`card card-lucro ${resumo.lucro_mes >= 0 ? 'positivo' : 'negativo'}`}>
                    <div className="card-icon">
                        <FaMoneyBillWave />
                    </div>
                    <div className="card-content">
                        <h3>{resumo.lucro_mes >= 0 ? 'Lucro do Mês' : 'Prejuízo do Mês'}</h3>
                        <p className="valor">{formatarMoeda(Math.abs(resumo.lucro_mes))}</p>
                        <small>Receitas: {formatarMoeda(resumo.receitas_mes)} | Despesas: {formatarMoeda(resumo.despesas_mes)}</small>
                    </div>
                </div>
            </div>

            {/* Alertas */}
            {alertas && alertas.length > 0 && (
                <div className="secao-alertas">
                    <h2><FaExclamationTriangle /> Alertas</h2>
                    <div className="lista-alertas">
                        {alertas.map((alerta) => (
                            <div key={alerta.id} className={`alerta alerta-${alerta.tipo}`}>
                                <span className="alerta-tipo">{alerta.tipo.replace('_', ' ').toUpperCase()}</span>
                                <span className="alerta-mensagem">{alerta.mensagem}</span>
                                <span className="alerta-data">{new Date(alerta.data_alerta).toLocaleDateString('pt-BR')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Contas Bancárias */}
            <div className="secao-contas-bancarias">
                <h2>Contas Bancárias</h2>
                <div className="lista-contas-bancarias">
                    {contas_bancarias && contas_bancarias.map((conta) => (
                        <div key={conta.id} className="conta-bancaria-card" style={{ borderLeftColor: conta.cor || '#007bff' }}>
                            <div className="conta-info">
                                <h4>{conta.nome}</h4>
                                <p className="conta-banco">{conta.banco} - {conta.tipo_conta}</p>
                            </div>
                            <div className="conta-saldo">
                                <span className="saldo-valor">{formatarMoeda(conta.saldo_atual)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Gráfico de Fluxo de Caixa */}
            <div className="secao-fluxo-caixa">
                <h2>Fluxo de Caixa (Últimos 6 Meses)</h2>
                <div className="grafico-fluxo">
                    {fluxo_caixa && fluxo_caixa.map((mes, index) => (
                        <div key={index} className="mes-coluna">
                            <div className="barras">
                                <div 
                                    className="barra barra-receita" 
                                    style={{ height: `${(mes.receitas / Math.max(...fluxo_caixa.map(m => Math.max(m.receitas, m.despesas)))) * 100}%` }}
                                    title={`Receitas: ${formatarMoeda(mes.receitas)}`}
                                />
                                <div 
                                    className="barra barra-despesa" 
                                    style={{ height: `${(mes.despesas / Math.max(...fluxo_caixa.map(m => Math.max(m.receitas, m.despesas)))) * 100}%` }}
                                    title={`Despesas: ${formatarMoeda(mes.despesas)}`}
                                />
                            </div>
                            <div className="mes-label">{mes.mes}</div>
                            <div className="mes-saldo" style={{ color: mes.saldo >= 0 ? '#10B981' : '#EF4444' }}>
                                {formatarMoeda(mes.saldo)}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="legenda-grafico">
                    <span className="legenda-item"><span className="cor-receita"></span> Receitas</span>
                    <span className="legenda-item"><span className="cor-despesa"></span> Despesas</span>
                </div>
            </div>

            {/* Resumo de Contas Vencidas e A Vencer */}
            <div className="secao-resumo-contas">
                <div className="resumo-card">
                    <h3>Contas a Pagar</h3>
                    <div className="resumo-item">
                        <span>Vencidas:</span>
                        <strong className="texto-vermelho">{contas_pagar.vencidas} ({formatarMoeda(contas_pagar.valor_vencido)})</strong>
                    </div>
                    <div className="resumo-item">
                        <span>A vencer (7 dias):</span>
                        <strong className="texto-laranja">{contas_pagar.a_vencer_7_dias} ({formatarMoeda(contas_pagar.valor_a_vencer_7_dias)})</strong>
                    </div>
                </div>

                <div className="resumo-card">
                    <h3>Contas a Receber</h3>
                    <div className="resumo-item">
                        <span>Vencidas:</span>
                        <strong className="texto-vermelho">{contas_receber.vencidas} ({formatarMoeda(contas_receber.valor_vencido)})</strong>
                    </div>
                    <div className="resumo-item">
                        <span>A vencer (7 dias):</span>
                        <strong className="texto-verde">{contas_receber.a_vencer_7_dias} ({formatarMoeda(contas_receber.valor_a_vencer_7_dias)})</strong>
                    </div>
                </div>
            </div>

            {/* Receitas e Despesas por Categoria */}
            {por_categoria && (
                <div className="secao-categorias">
                    <div className="categorias-card">
                        <h3>Receitas por Categoria (Mês Atual)</h3>
                        <div className="lista-categorias">
                            {por_categoria.receitas && por_categoria.receitas.length > 0 ? (
                                por_categoria.receitas.map((cat, index) => (
                                    <div key={index} className="categoria-item">
                                        <span>{cat.categoria}</span>
                                        <strong className="texto-verde">{formatarMoeda(cat.total)}</strong>
                                    </div>
                                ))
                            ) : (
                                <p className="sem-dados">Nenhuma receita registrada</p>
                            )}
                        </div>
                    </div>

                    <div className="categorias-card">
                        <h3>Despesas por Categoria (Mês Atual)</h3>
                        <div className="lista-categorias">
                            {por_categoria.despesas && por_categoria.despesas.length > 0 ? (
                                por_categoria.despesas.map((cat, index) => (
                                    <div key={index} className="categoria-item">
                                        <span>{cat.categoria}</span>
                                        <strong className="texto-vermelho">{formatarMoeda(cat.total)}</strong>
                                    </div>
                                ))
                            ) : (
                                <p className="sem-dados">Nenhuma despesa registrada</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardFinanceiro;

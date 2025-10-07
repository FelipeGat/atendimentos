import React, { useState, useEffect } from 'react';
import { lancamentosRecorrentesAPI, fornecedoresAPI, categoriasFinanceirasAPI, contasBancariasAPI } from '../../utils/api';
import { FaPlus, FaEdit, FaTrash, FaSync, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import './LancamentosRecorrentes.css';

const LancamentosRecorrentes = () => {
    const [lancamentos, setLancamentos] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [contasBancarias, setContasBancarias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [lancamentoSelecionado, setLancamentoSelecionado] = useState(null);
    const [filtro, setFiltro] = useState('todos'); // todos, ativo, inativo
    
    const [formData, setFormData] = useState({
        tipo: 'pagar',
        descricao: '',
        valor: '',
        categoria_id: '',
        fornecedor_id: '',
        cliente_id: '',
        conta_bancaria_id: '',
        forma_pagamento: '',
        frequencia: 'mensal',
        dia_vencimento: '1',
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        numero_parcelas: '',
        ativo: true,
        observacoes: ''
    });

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [lancamentosRes, fornecedoresRes, categoriasRes, contasBancariasRes] = await Promise.all([
                lancamentosRecorrentesAPI.listar(),
                fornecedoresAPI.listar(),
                categoriasFinanceirasAPI.listar(),
                contasBancariasAPI.listar()
            ]);
            
            setLancamentos(lancamentosRes.data);
            setFornecedores(fornecedoresRes.data);
            setCategorias(categoriasRes.data);
            setContasBancarias(contasBancariasRes.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const abrirModal = (lancamento = null) => {
        if (lancamento) {
            setLancamentoSelecionado(lancamento);
            setFormData({
                tipo: lancamento.tipo,
                descricao: lancamento.descricao,
                valor: lancamento.valor,
                categoria_id: lancamento.categoria_id || '',
                fornecedor_id: lancamento.fornecedor_id || '',
                cliente_id: lancamento.cliente_id || '',
                conta_bancaria_id: lancamento.conta_bancaria_id || '',
                forma_pagamento: lancamento.forma_pagamento || '',
                frequencia: lancamento.frequencia,
                dia_vencimento: lancamento.dia_vencimento,
                data_inicio: lancamento.data_inicio,
                data_fim: lancamento.data_fim || '',
                numero_parcelas: lancamento.numero_parcelas || '',
                ativo: lancamento.ativo === 1,
                observacoes: lancamento.observacoes || ''
            });
        } else {
            setLancamentoSelecionado(null);
            setFormData({
                tipo: 'pagar',
                descricao: '',
                valor: '',
                categoria_id: '',
                fornecedor_id: '',
                cliente_id: '',
                conta_bancaria_id: '',
                forma_pagamento: '',
                frequencia: 'mensal',
                dia_vencimento: '1',
                data_inicio: new Date().toISOString().split('T')[0],
                data_fim: '',
                numero_parcelas: '',
                ativo: true,
                observacoes: ''
            });
        }
        setModalAberto(true);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setLancamentoSelecionado(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            const dados = { 
                ...formData, 
                empresa_id: empresaId,
                ativo: formData.ativo ? 1 : 0
            };
            
            if (lancamentoSelecionado) {
                await lancamentosRecorrentesAPI.atualizar(lancamentoSelecionado.id, dados);
                alert('Lançamento atualizado com sucesso!');
            } else {
                await lancamentosRecorrentesAPI.criar(dados);
                alert('Lançamento criado com sucesso!');
            }
            
            fecharModal();
            carregarDados();
        } catch (error) {
            console.error('Erro ao salvar lançamento:', error);
            alert('Erro ao salvar lançamento: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleExcluir = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este lançamento recorrente?')) {
            return;
        }
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            await lancamentosRecorrentesAPI.excluir(id, empresaId);
            alert('Lançamento excluído com sucesso!');
            carregarDados();
        } catch (error) {
            console.error('Erro ao excluir lançamento:', error);
            alert('Erro ao excluir lançamento: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const gerarLancamentos = async () => {
        if (!window.confirm('Deseja gerar os lançamentos recorrentes do mês atual?')) {
            return;
        }
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            const response = await lancamentosRecorrentesAPI.gerar({ empresaId });
            alert(`${response.data.total_gerado} lançamento(s) gerado(s) com sucesso!`);
            carregarDados();
        } catch (error) {
            console.error('Erro ao gerar lançamentos:', error);
            alert('Erro ao gerar lançamentos: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const formatarMoeda = (valor) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    };

    const formatarData = (data) => {
        return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
    };

    const getFrequenciaLabel = (freq) => {
        const labels = {
            'diaria': 'Diária',
            'semanal': 'Semanal',
            'quinzenal': 'Quinzenal',
            'mensal': 'Mensal',
            'bimestral': 'Bimestral',
            'trimestral': 'Trimestral',
            'semestral': 'Semestral',
            'anual': 'Anual'
        };
        return labels[freq] || freq;
    };

    const lancamentosFiltrados = lancamentos.filter(lanc => {
        if (filtro === 'ativo') return lanc.ativo === 1;
        if (filtro === 'inativo') return lanc.ativo === 0;
        return true;
    });

    const categoriasReceita = categorias.filter(c => c.tipo === 'receita');
    const categoriasDespesa = categorias.filter(c => c.tipo === 'despesa');

    if (loading) {
        return <div className="loading">Carregando...</div>;
    }

    return (
        <div className="lancamentos-recorrentes-container">
            <div className="header">
                <h1>Lançamentos Recorrentes</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={gerarLancamentos}>
                        <FaSync /> Gerar Lançamentos do Mês
                    </button>
                    <button className="btn btn-primary" onClick={() => abrirModal()}>
                        <FaPlus /> Novo Lançamento
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="filtros">
                <button 
                    className={`filtro-btn ${filtro === 'todos' ? 'active' : ''}`}
                    onClick={() => setFiltro('todos')}
                >
                    Todos ({lancamentos.length})
                </button>
                <button 
                    className={`filtro-btn ${filtro === 'ativo' ? 'active' : ''}`}
                    onClick={() => setFiltro('ativo')}
                >
                    Ativos ({lancamentos.filter(l => l.ativo === 1).length})
                </button>
                <button 
                    className={`filtro-btn ${filtro === 'inativo' ? 'active' : ''}`}
                    onClick={() => setFiltro('inativo')}
                >
                    Inativos ({lancamentos.filter(l => l.ativo === 0).length})
                </button>
            </div>

            {/* Lista de Lançamentos */}
            <div className="lista-lancamentos">
                {lancamentosFiltrados.length === 0 ? (
                    <div className="sem-dados">Nenhum lançamento recorrente encontrado</div>
                ) : (
                    lancamentosFiltrados.map((lanc) => (
                        <div key={lanc.id} className={`lancamento-card ${lanc.tipo} ${lanc.ativo === 0 ? 'inativo' : ''}`}>
                            <div className="lancamento-header">
                                <div className="lancamento-tipo">
                                    {lanc.tipo === 'pagar' ? '💸 A Pagar' : '💰 A Receber'}
                                </div>
                                <div className="lancamento-status">
                                    {lanc.ativo === 1 ? (
                                        <span className="badge badge-ativo"><FaToggleOn /> Ativo</span>
                                    ) : (
                                        <span className="badge badge-inativo"><FaToggleOff /> Inativo</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="lancamento-body">
                                <h3>{lanc.descricao}</h3>
                                <div className="lancamento-info">
                                    <div className="info-item">
                                        <span className="label">Valor:</span>
                                        <span className="valor">{formatarMoeda(lanc.valor)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Frequência:</span>
                                        <span>{getFrequenciaLabel(lanc.frequencia)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Dia do Vencimento:</span>
                                        <span>Dia {lanc.dia_vencimento}</span>
                                    </div>
                                    {lanc.tipo === 'pagar' && lanc.fornecedor_nome && (
                                        <div className="info-item">
                                            <span className="label">Fornecedor:</span>
                                            <span>{lanc.fornecedor_nome}</span>
                                        </div>
                                    )}
                                    {lanc.tipo === 'receber' && lanc.cliente_nome && (
                                        <div className="info-item">
                                            <span className="label">Cliente:</span>
                                            <span>{lanc.cliente_nome}</span>
                                        </div>
                                    )}
                                    {lanc.categoria_nome && (
                                        <div className="info-item">
                                            <span className="label">Categoria:</span>
                                            <span>{lanc.categoria_nome}</span>
                                        </div>
                                    )}
                                    <div className="info-item">
                                        <span className="label">Início:</span>
                                        <span>{formatarData(lanc.data_inicio)}</span>
                                    </div>
                                    {lanc.data_fim && (
                                        <div className="info-item">
                                            <span className="label">Fim:</span>
                                            <span>{formatarData(lanc.data_fim)}</span>
                                        </div>
                                    )}
                                    {lanc.numero_parcelas && (
                                        <div className="info-item">
                                            <span className="label">Parcelas:</span>
                                            <span>{lanc.parcelas_geradas || 0} / {lanc.numero_parcelas}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="lancamento-acoes">
                                <button
                                    className="btn-icon btn-edit"
                                    onClick={() => abrirModal(lanc)}
                                    title="Editar"
                                >
                                    <FaEdit />
                                </button>
                                <button
                                    className="btn-icon btn-delete"
                                    onClick={() => handleExcluir(lanc.id)}
                                    title="Excluir"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Cadastro/Edição */}
            {modalAberto && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal modal-lancamento" onClick={(e) => e.stopPropagation()}>
                        <h2>{lancamentoSelecionado ? 'Editar Lançamento Recorrente' : 'Novo Lançamento Recorrente'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tipo *</label>
                                    <select
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                                        required
                                    >
                                        <option value="pagar">A Pagar</option>
                                        <option value="receber">A Receber</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={formData.ativo ? '1' : '0'}
                                        onChange={(e) => setFormData({...formData, ativo: e.target.value === '1'})}
                                    >
                                        <option value="1">Ativo</option>
                                        <option value="0">Inativo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Descrição *</label>
                                <input
                                    type="text"
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                                    required
                                    placeholder="Ex: Aluguel, Mensalidade, Salário..."
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Valor *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.valor}
                                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Categoria</label>
                                    <select
                                        value={formData.categoria_id}
                                        onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {(formData.tipo === 'pagar' ? categoriasDespesa : categoriasReceita).map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {formData.tipo === 'pagar' && (
                                <div className="form-group">
                                    <label>Fornecedor</label>
                                    <select
                                        value={formData.fornecedor_id}
                                        onChange={(e) => setFormData({...formData, fornecedor_id: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {fornecedores.map(f => (
                                            <option key={f.id} value={f.id}>{f.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Frequência *</label>
                                    <select
                                        value={formData.frequencia}
                                        onChange={(e) => setFormData({...formData, frequencia: e.target.value})}
                                        required
                                    >
                                        <option value="diaria">Diária</option>
                                        <option value="semanal">Semanal</option>
                                        <option value="quinzenal">Quinzenal</option>
                                        <option value="mensal">Mensal</option>
                                        <option value="bimestral">Bimestral</option>
                                        <option value="trimestral">Trimestral</option>
                                        <option value="semestral">Semestral</option>
                                        <option value="anual">Anual</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Dia do Vencimento *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.dia_vencimento}
                                        onChange={(e) => setFormData({...formData, dia_vencimento: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Data de Início *</label>
                                    <input
                                        type="date"
                                        value={formData.data_inicio}
                                        onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Data de Fim</label>
                                    <input
                                        type="date"
                                        value={formData.data_fim}
                                        onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Número de Parcelas</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.numero_parcelas}
                                    onChange={(e) => setFormData({...formData, numero_parcelas: e.target.value})}
                                    placeholder="Deixe em branco para indeterminado"
                                />
                            </div>

                            <div className="form-group">
                                <label>Observações</label>
                                <textarea
                                    value={formData.observacoes}
                                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                                    rows="3"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={fecharModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {lancamentoSelecionado ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LancamentosRecorrentes;

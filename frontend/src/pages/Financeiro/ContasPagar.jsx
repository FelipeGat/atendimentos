import React, { useState, useEffect } from 'react';
import { contasPagarAPI, fornecedoresAPI, categoriasFinanceirasAPI, contasBancariasAPI } from '../../utils/api';
import { FaPlus, FaEdit, FaTrash, FaMoneyBillWave, FaFilter, FaSearch } from 'react-icons/fa';
import './ContasPagar.css';

const ContasPagar = () => {
    const [contas, setContas] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [contasBancarias, setContasBancarias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [modalPagamento, setModalPagamento] = useState(false);
    const [contaSelecionada, setContaSelecionada] = useState(null);
    const [filtro, setFiltro] = useState('todas'); // todas, pendente, vencido, pago
    const [busca, setBusca] = useState('');
    
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        data_vencimento: '',
        fornecedor_id: '',
        categoria_id: '',
        forma_pagamento: '',
        numero_documento: '',
        observacoes: ''
    });

    const [formPagamento, setFormPagamento] = useState({
        valor_pago: '',
        data_pagamento: new Date().toISOString().split('T')[0],
        forma_pagamento: '',
        conta_bancaria_id: ''
    });

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [contasRes, fornecedoresRes, categoriasRes, contasBancariasRes] = await Promise.all([
                contasPagarAPI.listar(),
                fornecedoresAPI.listar(),
                categoriasFinanceirasAPI.listar(),
                contasBancariasAPI.listar()
            ]);
            
            setContas(contasRes.data);
            setFornecedores(fornecedoresRes.data);
            setCategorias(categoriasRes.data.filter(c => c.tipo === 'despesa'));
            setContasBancarias(contasBancariasRes.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const abrirModal = (conta = null) => {
        if (conta) {
            setContaSelecionada(conta);
            setFormData({
                descricao: conta.descricao,
                valor: conta.valor,
                data_vencimento: conta.data_vencimento,
                fornecedor_id: conta.fornecedor_id || '',
                categoria_id: conta.categoria_id || '',
                forma_pagamento: conta.forma_pagamento || '',
                numero_documento: conta.numero_documento || '',
                observacoes: conta.observacoes || ''
            });
        } else {
            setContaSelecionada(null);
            setFormData({
                descricao: '',
                valor: '',
                data_vencimento: '',
                fornecedor_id: '',
                categoria_id: '',
                forma_pagamento: '',
                numero_documento: '',
                observacoes: ''
            });
        }
        setModalAberto(true);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setContaSelecionada(null);
    };

    const abrirModalPagamento = (conta) => {
        setContaSelecionada(conta);
        setFormPagamento({
            valor_pago: conta.valor,
            data_pagamento: new Date().toISOString().split('T')[0],
            forma_pagamento: '',
            conta_bancaria_id: ''
        });
        setModalPagamento(true);
    };

    const fecharModalPagamento = () => {
        setModalPagamento(false);
        setContaSelecionada(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            const dados = { ...formData, empresa_id: empresaId };
            
            if (contaSelecionada) {
                await contasPagarAPI.atualizar(contaSelecionada.id, dados);
                alert('Conta atualizada com sucesso!');
            } else {
                await contasPagarAPI.criar(dados);
                alert('Conta criada com sucesso!');
            }
            
            fecharModal();
            carregarDados();
        } catch (error) {
            console.error('Erro ao salvar conta:', error);
            alert('Erro ao salvar conta: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handlePagamento = async (e) => {
        e.preventDefault();
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            const dados = { ...formPagamento, empresa_id: empresaId };
            
            await contasPagarAPI.registrarPagamento(contaSelecionada.id, dados);
            alert('Pagamento registrado com sucesso!');
            
            fecharModalPagamento();
            carregarDados();
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            alert('Erro ao registrar pagamento: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleExcluir = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir esta conta?')) {
            return;
        }
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            await contasPagarAPI.excluir(id, empresaId);
            alert('Conta excluída com sucesso!');
            carregarDados();
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            alert('Erro ao excluir conta: ' + (error.message || 'Erro desconhecido'));
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

    const getStatusClass = (status) => {
        const classes = {
            'pendente': 'status-pendente',
            'pago': 'status-pago',
            'vencido': 'status-vencido',
            'cancelado': 'status-cancelado'
        };
        return classes[status] || '';
    };

    const contasFiltradas = contas.filter(conta => {
        const matchFiltro = filtro === 'todas' || conta.status === filtro;
        const matchBusca = busca === '' || 
            conta.descricao.toLowerCase().includes(busca.toLowerCase()) ||
            (conta.fornecedor_nome && conta.fornecedor_nome.toLowerCase().includes(busca.toLowerCase()));
        
        return matchFiltro && matchBusca;
    });

    const totalPendente = contas
        .filter(c => c.status === 'pendente' || c.status === 'vencido')
        .reduce((sum, c) => sum + parseFloat(c.valor), 0);

    const totalPago = contas
        .filter(c => c.status === 'pago')
        .reduce((sum, c) => sum + parseFloat(c.valor_pago), 0);

    if (loading) {
        return <div className="loading">Carregando...</div>;
    }

    return (
        <div className="contas-pagar-container">
            <div className="header">
                <h1>Contas a Pagar</h1>
                <button className="btn btn-primary" onClick={() => abrirModal()}>
                    <FaPlus /> Nova Conta
                </button>
            </div>

            {/* Resumo */}
            <div className="resumo-cards">
                <div className="resumo-card">
                    <h3>Total Pendente</h3>
                    <p className="valor-pendente">{formatarMoeda(totalPendente)}</p>
                </div>
                <div className="resumo-card">
                    <h3>Total Pago (Mês)</h3>
                    <p className="valor-pago">{formatarMoeda(totalPago)}</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="filtros">
                <div className="filtro-grupo">
                    <FaFilter />
                    <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                        <option value="todas">Todas</option>
                        <option value="pendente">Pendentes</option>
                        <option value="vencido">Vencidas</option>
                        <option value="pago">Pagas</option>
                    </select>
                </div>
                
                <div className="busca-grupo">
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Buscar por descrição ou fornecedor..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabela */}
            <div className="tabela-container">
                <table className="tabela">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Fornecedor</th>
                            <th>Categoria</th>
                            <th>Vencimento</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contasFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="sem-dados">Nenhuma conta encontrada</td>
                            </tr>
                        ) : (
                            contasFiltradas.map((conta) => (
                                <tr key={conta.id}>
                                    <td>{conta.descricao}</td>
                                    <td>{conta.fornecedor_nome || '-'}</td>
                                    <td>{conta.categoria_nome || '-'}</td>
                                    <td>{formatarData(conta.data_vencimento)}</td>
                                    <td className="valor">{formatarMoeda(conta.valor)}</td>
                                    <td>
                                        <span className={`status ${getStatusClass(conta.status)}`}>
                                            {conta.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="acoes">
                                        {conta.status !== 'pago' && (
                                            <>
                                                <button
                                                    className="btn-icon btn-success"
                                                    onClick={() => abrirModalPagamento(conta)}
                                                    title="Registrar Pagamento"
                                                >
                                                    <FaMoneyBillWave />
                                                </button>
                                                <button
                                                    className="btn-icon btn-edit"
                                                    onClick={() => abrirModal(conta)}
                                                    title="Editar"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    className="btn-icon btn-delete"
                                                    onClick={() => handleExcluir(conta.id)}
                                                    title="Excluir"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </>
                                        )}
                                        {conta.status === 'pago' && (
                                            <span className="texto-sucesso">✓ Pago em {formatarData(conta.data_pagamento)}</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Cadastro/Edição */}
            {modalAberto && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{contaSelecionada ? 'Editar Conta' : 'Nova Conta a Pagar'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Descrição *</label>
                                <input
                                    type="text"
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                                    required
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
                                    <label>Data de Vencimento *</label>
                                    <input
                                        type="date"
                                        value={formData.data_vencimento}
                                        onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
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

                                <div className="form-group">
                                    <label>Categoria</label>
                                    <select
                                        value={formData.categoria_id}
                                        onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {categorias.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Número do Documento</label>
                                <input
                                    type="text"
                                    value={formData.numero_documento}
                                    onChange={(e) => setFormData({...formData, numero_documento: e.target.value})}
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
                                    {contaSelecionada ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Pagamento */}
            {modalPagamento && (
                <div className="modal-overlay" onClick={fecharModalPagamento}>
                    <div className="modal modal-pagamento" onClick={(e) => e.stopPropagation()}>
                        <h2>Registrar Pagamento</h2>
                        <p className="info-conta">
                            <strong>{contaSelecionada?.descricao}</strong><br/>
                            Valor original: {formatarMoeda(contaSelecionada?.valor)}
                        </p>
                        
                        <form onSubmit={handlePagamento}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Valor Pago *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formPagamento.valor_pago}
                                        onChange={(e) => setFormPagamento({...formPagamento, valor_pago: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Data do Pagamento *</label>
                                    <input
                                        type="date"
                                        value={formPagamento.data_pagamento}
                                        onChange={(e) => setFormPagamento({...formPagamento, data_pagamento: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Forma de Pagamento *</label>
                                    <select
                                        value={formPagamento.forma_pagamento}
                                        onChange={(e) => setFormPagamento({...formPagamento, forma_pagamento: e.target.value})}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="pix">PIX</option>
                                        <option value="cartao_credito">Cartão de Crédito</option>
                                        <option value="cartao_debito">Cartão de Débito</option>
                                        <option value="boleto">Boleto</option>
                                        <option value="transferencia">Transferência</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Conta Bancária</label>
                                    <select
                                        value={formPagamento.conta_bancaria_id}
                                        onChange={(e) => setFormPagamento({...formPagamento, conta_bancaria_id: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {contasBancarias.map(cb => (
                                            <option key={cb.id} value={cb.id}>{cb.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={fecharModalPagamento}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-success">
                                    Confirmar Pagamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContasPagar;

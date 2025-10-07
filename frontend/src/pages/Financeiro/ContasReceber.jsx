import React, { useState, useEffect } from 'react';
import { contasReceberAPI, categoriasFinanceirasAPI, contasBancariasAPI } from '../../utils/api';
import { FaPlus, FaEdit, FaTrash, FaMoneyBillWave, FaFilter, FaSearch, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import './ContasReceber.css';

const ContasReceber = () => {
    const [contas, setContas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [contasBancarias, setContasBancarias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [modalRecebimento, setModalRecebimento] = useState(false);
    const [contaSelecionada, setContaSelecionada] = useState(null);
    const [filtro, setFiltro] = useState('todas');
    const [busca, setBusca] = useState('');
    
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        data_vencimento: '',
        cliente_id: '',
        categoria_id: '',
        forma_recebimento: '',
        numero_documento: '',
        observacoes: ''
    });

    const [formRecebimento, setFormRecebimento] = useState({
        valor_recebido: '',
        data_recebimento: new Date().toISOString().split('T')[0],
        forma_recebimento: '',
        conta_bancaria_id: ''
    });

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [contasRes, categoriasRes, contasBancariasRes] = await Promise.all([
                contasReceberAPI.listar(),
                categoriasFinanceirasAPI.listar(),
                contasBancariasAPI.listar()
            ]);
            
            setContas(contasRes.data);
            setCategorias(categoriasRes.data.filter(c => c.tipo === 'receita'));
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
                cliente_id: conta.cliente_id || '',
                categoria_id: conta.categoria_id || '',
                forma_recebimento: conta.forma_recebimento || '',
                numero_documento: conta.numero_documento || '',
                observacoes: conta.observacoes || ''
            });
        } else {
            setContaSelecionada(null);
            setFormData({
                descricao: '',
                valor: '',
                data_vencimento: '',
                cliente_id: '',
                categoria_id: '',
                forma_recebimento: '',
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

    const abrirModalRecebimento = (conta) => {
        setContaSelecionada(conta);
        setFormRecebimento({
            valor_recebido: conta.valor,
            data_recebimento: new Date().toISOString().split('T')[0],
            forma_recebimento: '',
            conta_bancaria_id: ''
        });
        setModalRecebimento(true);
    };

    const fecharModalRecebimento = () => {
        setModalRecebimento(false);
        setContaSelecionada(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            const dados = { ...formData, empresa_id: empresaId };
            
            if (contaSelecionada) {
                await contasReceberAPI.atualizar(contaSelecionada.id, dados);
                alert('Conta atualizada com sucesso!');
            } else {
                await contasReceberAPI.criar(dados);
                alert('Conta criada com sucesso!');
            }
            
            fecharModal();
            carregarDados();
        } catch (error) {
            console.error('Erro ao salvar conta:', error);
            alert('Erro ao salvar conta: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleRecebimento = async (e) => {
        e.preventDefault();
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            const dados = { ...formRecebimento, empresa_id: empresaId };
            
            await contasReceberAPI.registrarRecebimento(contaSelecionada.id, dados);
            alert('Recebimento registrado com sucesso!');
            
            fecharModalRecebimento();
            carregarDados();
        } catch (error) {
            console.error('Erro ao registrar recebimento:', error);
            alert('Erro ao registrar recebimento: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleExcluir = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir esta conta?')) {
            return;
        }
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            await contasReceberAPI.excluir(id, empresaId);
            alert('Conta excluída com sucesso!');
            carregarDados();
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            alert('Erro ao excluir conta: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const gerarCobranca = (conta, tipo) => {
        if (tipo === 'whatsapp') {
            alert('Funcionalidade de cobrança via WhatsApp será implementada em breve!');
        } else if (tipo === 'email') {
            alert('Funcionalidade de cobrança via E-mail será implementada em breve!');
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
            'recebido': 'status-recebido',
            'vencido': 'status-vencido',
            'cancelado': 'status-cancelado'
        };
        return classes[status] || '';
    };

    const contasFiltradas = contas.filter(conta => {
        const matchFiltro = filtro === 'todas' || conta.status === filtro;
        const matchBusca = busca === '' || 
            conta.descricao.toLowerCase().includes(busca.toLowerCase()) ||
            (conta.cliente_nome && conta.cliente_nome.toLowerCase().includes(busca.toLowerCase()));
        
        return matchFiltro && matchBusca;
    });

    const totalPendente = contas
        .filter(c => c.status === 'pendente' || c.status === 'vencido')
        .reduce((sum, c) => sum + parseFloat(c.valor), 0);

    const totalRecebido = contas
        .filter(c => c.status === 'recebido')
        .reduce((sum, c) => sum + parseFloat(c.valor_recebido), 0);

    if (loading) {
        return <div className="loading">Carregando...</div>;
    }

    return (
        <div className="contas-receber-container">
            <div className="header">
                <h1>Contas a Receber</h1>
                <button className="btn btn-primary" onClick={() => abrirModal()}>
                    <FaPlus /> Nova Conta
                </button>
            </div>

            {/* Resumo */}
            <div className="resumo-cards">
                <div className="resumo-card">
                    <h3>Total a Receber</h3>
                    <p className="valor-pendente">{formatarMoeda(totalPendente)}</p>
                </div>
                <div className="resumo-card">
                    <h3>Total Recebido (Mês)</h3>
                    <p className="valor-recebido">{formatarMoeda(totalRecebido)}</p>
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
                        <option value="recebido">Recebidas</option>
                    </select>
                </div>
                
                <div className="busca-grupo">
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Buscar por descrição ou cliente..."
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
                            <th>Cliente</th>
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
                                    <td>{conta.cliente_nome || '-'}</td>
                                    <td>{conta.categoria_nome || '-'}</td>
                                    <td>{formatarData(conta.data_vencimento)}</td>
                                    <td className="valor">{formatarMoeda(conta.valor)}</td>
                                    <td>
                                        <span className={`status ${getStatusClass(conta.status)}`}>
                                            {conta.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="acoes">
                                        {conta.status !== 'recebido' && (
                                            <>
                                                <button
                                                    className="btn-icon btn-success"
                                                    onClick={() => abrirModalRecebimento(conta)}
                                                    title="Registrar Recebimento"
                                                >
                                                    <FaMoneyBillWave />
                                                </button>
                                                <button
                                                    className="btn-icon btn-whatsapp"
                                                    onClick={() => gerarCobranca(conta, 'whatsapp')}
                                                    title="Enviar cobrança via WhatsApp"
                                                >
                                                    <FaWhatsapp />
                                                </button>
                                                <button
                                                    className="btn-icon btn-email"
                                                    onClick={() => gerarCobranca(conta, 'email')}
                                                    title="Enviar cobrança via E-mail"
                                                >
                                                    <FaEnvelope />
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
                                        {conta.status === 'recebido' && (
                                            <span className="texto-sucesso">✓ Recebido em {formatarData(conta.data_recebimento)}</span>
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
                        <h2>{contaSelecionada ? 'Editar Conta' : 'Nova Conta a Receber'}</h2>
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
                                    <label>Cliente ID</label>
                                    <input
                                        type="number"
                                        value={formData.cliente_id}
                                        onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
                                        placeholder="ID do cliente"
                                    />
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

            {/* Modal de Recebimento */}
            {modalRecebimento && (
                <div className="modal-overlay" onClick={fecharModalRecebimento}>
                    <div className="modal modal-recebimento" onClick={(e) => e.stopPropagation()}>
                        <h2>Registrar Recebimento</h2>
                        <p className="info-conta">
                            <strong>{contaSelecionada?.descricao}</strong><br/>
                            Valor original: {formatarMoeda(contaSelecionada?.valor)}
                        </p>
                        
                        <form onSubmit={handleRecebimento}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Valor Recebido *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formRecebimento.valor_recebido}
                                        onChange={(e) => setFormRecebimento({...formRecebimento, valor_recebido: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Data do Recebimento *</label>
                                    <input
                                        type="date"
                                        value={formRecebimento.data_recebimento}
                                        onChange={(e) => setFormRecebimento({...formRecebimento, data_recebimento: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Forma de Recebimento *</label>
                                    <select
                                        value={formRecebimento.forma_recebimento}
                                        onChange={(e) => setFormRecebimento({...formRecebimento, forma_recebimento: e.target.value})}
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
                                        value={formRecebimento.conta_bancaria_id}
                                        onChange={(e) => setFormRecebimento({...formRecebimento, conta_bancaria_id: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {contasBancarias.map(cb => (
                                            <option key={cb.id} value={cb.id}>{cb.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={fecharModalRecebimento}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-success">
                                    Confirmar Recebimento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContasReceber;

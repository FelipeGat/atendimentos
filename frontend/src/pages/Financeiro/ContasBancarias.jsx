import React, { useState, useEffect } from 'react';
import { contasBancariasAPI, categoriasFinanceirasAPI } from '../../utils/api';
import { FaPlus, FaEdit, FaTrash, FaExchangeAlt, FaHistory, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import './ContasBancarias.css';

const ContasBancarias = () => {
    const [contas, setContas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [modalTransferencia, setModalTransferencia] = useState(false);
    const [modalMovimentacao, setModalMovimentacao] = useState(false);
    const [modalHistorico, setModalHistorico] = useState(false);
    const [contaSelecionada, setContaSelecionada] = useState(null);
    
    const [formData, setFormData] = useState({
        nome: '',
        banco: '',
        agencia: '',
        conta: '',
        tipo_conta: 'corrente',
        saldo_inicial: '0',
        cor: '#007bff',
        icone_banco: ''
    });

    const [formTransferencia, setFormTransferencia] = useState({
        conta_origem_id: '',
        conta_destino_id: '',
        valor: '',
        descricao: ''
    });

    const [formMovimentacao, setFormMovimentacao] = useState({
        conta_bancaria_id: '',
        tipo: 'entrada',
        valor: '',
        data_movimentacao: new Date().toISOString().split('T')[0],
        descricao: '',
        categoria_id: ''
    });

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [contasRes, categoriasRes] = await Promise.all([
                contasBancariasAPI.listar(),
                categoriasFinanceirasAPI.listar()
            ]);
            
            setContas(contasRes.data);
            setCategorias(categoriasRes.data);
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
                nome: conta.nome,
                banco: conta.banco || '',
                agencia: conta.agencia || '',
                conta: conta.conta || '',
                tipo_conta: conta.tipo_conta,
                saldo_inicial: conta.saldo_inicial,
                cor: conta.cor || '#007bff',
                icone_banco: conta.icone_banco || ''
            });
        } else {
            setContaSelecionada(null);
            setFormData({
                nome: '',
                banco: '',
                agencia: '',
                conta: '',
                tipo_conta: 'corrente',
                saldo_inicial: '0',
                cor: '#007bff',
                icone_banco: ''
            });
        }
        setModalAberto(true);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setContaSelecionada(null);
    };

    const abrirModalTransferencia = () => {
        setFormTransferencia({
            conta_origem_id: '',
            conta_destino_id: '',
            valor: '',
            descricao: ''
        });
        setModalTransferencia(true);
    };

    const abrirModalMovimentacao = () => {
        setFormMovimentacao({
            conta_bancaria_id: '',
            tipo: 'entrada',
            valor: '',
            data_movimentacao: new Date().toISOString().split('T')[0],
            descricao: '',
            categoria_id: ''
        });
        setModalMovimentacao(true);
    };

    const abrirModalHistorico = async (conta) => {
        setContaSelecionada(conta);
        try {
            const response = await contasBancariasAPI.listarMovimentacoes(conta.id);
            setMovimentacoes(response.data);
            setModalHistorico(true);
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            alert('Erro ao carregar histórico');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            const dados = { ...formData, empresa_id: empresaId };
            
            if (contaSelecionada) {
                await contasBancariasAPI.atualizar(contaSelecionada.id, dados);
                alert('Conta atualizada com sucesso!');
            } else {
                await contasBancariasAPI.criar(dados);
                alert('Conta criada com sucesso!');
            }
            
            fecharModal();
            carregarDados();
        } catch (error) {
            console.error('Erro ao salvar conta:', error);
            alert('Erro ao salvar conta: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleTransferencia = async (e) => {
        e.preventDefault();
        
        if (formTransferencia.conta_origem_id === formTransferencia.conta_destino_id) {
            alert('A conta de origem deve ser diferente da conta de destino!');
            return;
        }
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            const dados = { ...formTransferencia, empresa_id: empresaId };
            
            await contasBancariasAPI.transferir(dados);
            alert('Transferência realizada com sucesso!');
            
            setModalTransferencia(false);
            carregarDados();
        } catch (error) {
            console.error('Erro ao realizar transferência:', error);
            alert('Erro ao realizar transferência: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleMovimentacao = async (e) => {
        e.preventDefault();
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            const dados = { ...formMovimentacao, empresa_id: empresaId };
            
            await contasBancariasAPI.registrarMovimentacao(dados);
            alert('Movimentação registrada com sucesso!');
            
            setModalMovimentacao(false);
            carregarDados();
        } catch (error) {
            console.error('Erro ao registrar movimentação:', error);
            alert('Erro ao registrar movimentação: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleExcluir = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir esta conta bancária?')) {
            return;
        }
        
        try {
            const empresaId = localStorage.getItem('empresa_id') || 1;
            await contasBancariasAPI.excluir(id, empresaId);
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

    const formatarDataHora = (dataHora) => {
        return new Date(dataHora).toLocaleString('pt-BR');
    };

    const saldoTotal = contas.reduce((sum, c) => sum + parseFloat(c.saldo_atual || 0), 0);

    if (loading) {
        return <div className="loading">Carregando...</div>;
    }

    return (
        <div className="contas-bancarias-container">
            <div className="header">
                <h1>Contas Bancárias</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={abrirModalMovimentacao}>
                        <FaArrowUp /> Nova Movimentação
                    </button>
                    <button className="btn btn-secondary" onClick={abrirModalTransferencia}>
                        <FaExchangeAlt /> Transferência
                    </button>
                    <button className="btn btn-primary" onClick={() => abrirModal()}>
                        <FaPlus /> Nova Conta
                    </button>
                </div>
            </div>

            {/* Resumo */}
            <div className="resumo-saldo">
                <h2>Saldo Total</h2>
                <p className="saldo-total">{formatarMoeda(saldoTotal)}</p>
            </div>

            {/* Lista de Contas */}
            <div className="lista-contas">
                {contas.length === 0 ? (
                    <div className="sem-dados">Nenhuma conta bancária cadastrada</div>
                ) : (
                    contas.map((conta) => (
                        <div key={conta.id} className="conta-card" style={{ borderLeftColor: conta.cor || '#007bff' }}>
                            <div className="conta-header">
                                <div className="conta-info">
                                    <h3>{conta.nome}</h3>
                                    <p className="conta-banco">{conta.banco}</p>
                                    <p className="conta-detalhes">
                                        {conta.tipo_conta === 'corrente' ? 'Conta Corrente' : 
                                         conta.tipo_conta === 'poupanca' ? 'Poupança' : 
                                         conta.tipo_conta === 'investimento' ? 'Investimento' : 'Carteira'}
                                        {conta.agencia && conta.conta && ` • Ag: ${conta.agencia} • Conta: ${conta.conta}`}
                                    </p>
                                </div>
                                <div className="conta-saldo">
                                    <span className="label">Saldo Atual</span>
                                    <span className={`valor ${parseFloat(conta.saldo_atual) >= 0 ? 'positivo' : 'negativo'}`}>
                                        {formatarMoeda(conta.saldo_atual)}
                                    </span>
                                </div>
                            </div>
                            <div className="conta-acoes">
                                <button
                                    className="btn-icon btn-history"
                                    onClick={() => abrirModalHistorico(conta)}
                                    title="Ver Histórico"
                                >
                                    <FaHistory /> Histórico
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
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Cadastro/Edição */}
            {modalAberto && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{contaSelecionada ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nome da Conta *</label>
                                <input
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                    required
                                    placeholder="Ex: Banco do Brasil - Principal"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Banco</label>
                                    <input
                                        type="text"
                                        value={formData.banco}
                                        onChange={(e) => setFormData({...formData, banco: e.target.value})}
                                        placeholder="Ex: Banco do Brasil"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Tipo de Conta *</label>
                                    <select
                                        value={formData.tipo_conta}
                                        onChange={(e) => setFormData({...formData, tipo_conta: e.target.value})}
                                        required
                                    >
                                        <option value="corrente">Conta Corrente</option>
                                        <option value="poupanca">Poupança</option>
                                        <option value="investimento">Investimento</option>
                                        <option value="carteira">Carteira/Dinheiro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Agência</label>
                                    <input
                                        type="text"
                                        value={formData.agencia}
                                        onChange={(e) => setFormData({...formData, agencia: e.target.value})}
                                        placeholder="0000-0"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Número da Conta</label>
                                    <input
                                        type="text"
                                        value={formData.conta}
                                        onChange={(e) => setFormData({...formData, conta: e.target.value})}
                                        placeholder="00000-0"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Saldo Inicial *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.saldo_inicial}
                                        onChange={(e) => setFormData({...formData, saldo_inicial: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Cor</label>
                                    <input
                                        type="color"
                                        value={formData.cor}
                                        onChange={(e) => setFormData({...formData, cor: e.target.value})}
                                    />
                                </div>
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

            {/* Modal de Transferência */}
            {modalTransferencia && (
                <div className="modal-overlay" onClick={() => setModalTransferencia(false)}>
                    <div className="modal modal-transferencia" onClick={(e) => e.stopPropagation()}>
                        <h2>Transferência entre Contas</h2>
                        <form onSubmit={handleTransferencia}>
                            <div className="form-group">
                                <label>Conta de Origem *</label>
                                <select
                                    value={formTransferencia.conta_origem_id}
                                    onChange={(e) => setFormTransferencia({...formTransferencia, conta_origem_id: e.target.value})}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {contas.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome} - {formatarMoeda(c.saldo_atual)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Conta de Destino *</label>
                                <select
                                    value={formTransferencia.conta_destino_id}
                                    onChange={(e) => setFormTransferencia({...formTransferencia, conta_destino_id: e.target.value})}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {contas.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome} - {formatarMoeda(c.saldo_atual)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Valor *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formTransferencia.valor}
                                    onChange={(e) => setFormTransferencia({...formTransferencia, valor: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Descrição</label>
                                <input
                                    type="text"
                                    value={formTransferencia.descricao}
                                    onChange={(e) => setFormTransferencia({...formTransferencia, descricao: e.target.value})}
                                    placeholder="Motivo da transferência"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setModalTransferencia(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Transferir
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Movimentação */}
            {modalMovimentacao && (
                <div className="modal-overlay" onClick={() => setModalMovimentacao(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Nova Movimentação</h2>
                        <form onSubmit={handleMovimentacao}>
                            <div className="form-group">
                                <label>Conta Bancária *</label>
                                <select
                                    value={formMovimentacao.conta_bancaria_id}
                                    onChange={(e) => setFormMovimentacao({...formMovimentacao, conta_bancaria_id: e.target.value})}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {contas.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tipo *</label>
                                    <select
                                        value={formMovimentacao.tipo}
                                        onChange={(e) => setFormMovimentacao({...formMovimentacao, tipo: e.target.value})}
                                        required
                                    >
                                        <option value="entrada">Entrada</option>
                                        <option value="saida">Saída</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Valor *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formMovimentacao.valor}
                                        onChange={(e) => setFormMovimentacao({...formMovimentacao, valor: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Data *</label>
                                    <input
                                        type="date"
                                        value={formMovimentacao.data_movimentacao}
                                        onChange={(e) => setFormMovimentacao({...formMovimentacao, data_movimentacao: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Categoria</label>
                                    <select
                                        value={formMovimentacao.categoria_id}
                                        onChange={(e) => setFormMovimentacao({...formMovimentacao, categoria_id: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {categorias.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Descrição *</label>
                                <input
                                    type="text"
                                    value={formMovimentacao.descricao}
                                    onChange={(e) => setFormMovimentacao({...formMovimentacao, descricao: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setModalMovimentacao(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Registrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Histórico */}
            {modalHistorico && (
                <div className="modal-overlay" onClick={() => setModalHistorico(false)}>
                    <div className="modal modal-historico" onClick={(e) => e.stopPropagation()}>
                        <h2>Histórico - {contaSelecionada?.nome}</h2>
                        <div className="historico-lista">
                            {movimentacoes.length === 0 ? (
                                <p className="sem-dados">Nenhuma movimentação encontrada</p>
                            ) : (
                                movimentacoes.map((mov) => (
                                    <div key={mov.id} className={`historico-item ${mov.tipo}`}>
                                        <div className="historico-icon">
                                            {mov.tipo === 'entrada' ? <FaArrowUp /> : <FaArrowDown />}
                                        </div>
                                        <div className="historico-info">
                                            <strong>{mov.descricao}</strong>
                                            <small>{formatarDataHora(mov.data_movimentacao)}</small>
                                            {mov.categoria_nome && <span className="categoria">{mov.categoria_nome}</span>}
                                        </div>
                                        <div className={`historico-valor ${mov.tipo}`}>
                                            {mov.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(mov.valor)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setModalHistorico(false)}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContasBancarias;

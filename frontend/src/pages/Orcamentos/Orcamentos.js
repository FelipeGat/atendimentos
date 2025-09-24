import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Filter, Eye, Edit, Trash2, FileText, Calendar,
    DollarSign, Building, User, Clock, CheckCircle, XCircle, AlertCircle, Send
} from 'lucide-react';
// Importe o Toaster para exibir as notificações
import toast, { Toaster } from 'react-hot-toast';
import './Orcamentos.css';

import FormularioComponent from './FormularioOrcamento';

const API_BASE = `${process.env.REACT_APP_API_BASE_URL}/orcamentos.php`;

const OrcamentosPrincipal = () => {
    // Garanta que o estado inicial seja sempre um array
    const [orcamentos, setOrcamentos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [clientes, setClientes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingOrcamento, setEditingOrcamento] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [filters, setFilters] = useState({
        search: '', status: '', empresa_id: '', cliente_id: '', data_inicio: '', data_fim: ''
    });

    const statusOptions = [
        { value: 'rascunho', label: 'Rascunho', color: '#94a3b8', icon: Edit },
        { value: 'enviado', label: 'Enviado', color: '#3b82f6', icon: Send },
        { value: 'aprovado', label: 'Aprovado', color: '#10b981', icon: CheckCircle },
        { value: 'reprovado', label: 'Reprovado', color: '#ef4444', icon: XCircle },
        { value: 'cancelado', label: 'Cancelado', color: '#6b7280', icon: AlertCircle }
    ];

    const getHeaders = () => ({
        'X-Empresa-ID': localStorage.getItem('empresa_id') || '1',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    });

    const apiRequest = async (url, options = {}) => {
        try {
            const response = await fetch(url, { ...options, headers: { ...getHeaders(), ...options.headers } });
            // O erro 500 do PHP não retorna JSON, então precisamos tratar isso.
            if (!response.ok) {
                // Tenta ler a mensagem de erro do backend, se houver
                const errorText = await response.text();
                console.error("Erro do Servidor (Backend):", errorText);
                throw new Error(`Erro no servidor (HTTP ${response.status}). Verifique o console do backend.`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            // Repassa o erro para a função que chamou
            throw error;
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orcamentosResult, empresasResult, clientesResult] = await Promise.all([
                apiRequest(API_BASE),
                apiRequest(`${process.env.REACT_APP_API_BASE_URL}/empresas.php`),
                apiRequest(`${process.env.REACT_APP_API_BASE_URL}/clientes.php`)
            ]);

            // Validação robusta: garante que estamos recebendo um array
            setOrcamentos(Array.isArray(orcamentosResult.data) ? orcamentosResult.data : []);
            setEmpresas(Array.isArray(empresasResult.data) ? empresasResult.data : []);
            setClientes(Array.isArray(clientesResult.data) ? clientesResult.data : []);

        } catch (error) {
            toast.error(error.message);
            // **CORREÇÃO CRÍTICA**: Garante que o estado seja um array vazio em caso de falha total da API
            setOrcamentos([]);
            setEmpresas([]);
            setClientes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const handleCreate = () => {
        setEditingOrcamento(null);
        setShowForm(true);
    };

    const handleEdit = async (orcamento) => {
        try {
            const result = await apiRequest(`${API_BASE}?id=${orcamento.id}`);
            setEditingOrcamento(result.data);
            setShowForm(true);
        } catch (error) {
            toast.error('Erro ao carregar orçamento: ' + error.message);
        }
    };

    const handleDelete = async (orcamento) => {
        if (!window.confirm(`Tem certeza que deseja excluir o orçamento #${orcamento.numero_orcamento}?`)) return;
        try {
            await apiRequest(`${API_BASE}?id=${orcamento.id}`, { method: 'DELETE' });
            toast.success('Orçamento excluído com sucesso');
            fetchData();
        } catch (error) {
            toast.error('Erro ao excluir: ' + error.message);
        }
    };

    const handleSave = async () => {
        toast.success(editingOrcamento ? 'Orçamento atualizado!' : 'Orçamento criado!');
        setShowForm(false);
        setEditingOrcamento(null);
        fetchData();
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingOrcamento(null);
    };

    const getEmpresaNome = (id) => empresas.find(e => String(e.id) === String(id))?.nome || `Empresa #${id}`;
    const getClienteNome = (id) => clientes.find(c => String(c.id) === String(id))?.nome || `Cliente #${id}`;
    const getStatusInfo = (status) => statusOptions.find(s => s.value === status?.toLowerCase()) || { value: status, label: status, color: '#6b7280', icon: AlertCircle };
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';

    const applyFilters = (orcamentosList) => {
        // **CORREÇÃO DE SEGURANÇA**: Garante que a função não quebre se receber algo que não seja um array.
        if (!Array.isArray(orcamentosList)) {
            return [];
        }
        return orcamentosList.filter(orcamento => {
            const search = filters.search.toLowerCase();
            const matchesSearch = !search ||
                orcamento.numero_orcamento?.toString().includes(search) ||
                orcamento.referencia?.toLowerCase().includes(search) ||
                getClienteNome(orcamento.cliente_id).toLowerCase().includes(search);
            const matchesStatus = !filters.status || orcamento.status?.toLowerCase() === filters.status;
            return matchesSearch && matchesStatus;
        });
    };

    const resetFilters = () => {
        setFilters({ search: '', status: '', empresa_id: '', cliente_id: '', data_inicio: '', data_fim: '' });
    };

    const filteredOrcamentos = applyFilters(orcamentos);
    const totalRecords = filteredOrcamentos.length;
    const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrcamentos = filteredOrcamentos.slice(startIndex, endIndex);

    const OrcamentoRow = ({ orcamento }) => {
        const statusInfo = getStatusInfo(orcamento.status);
        return (
            <tr>
                <td>#{orcamento.numero_orcamento || orcamento.id}</td>
                <td><Building size={16} /> {getEmpresaNome(orcamento.empresa_id)}</td>
                <td><User size={16} /> {getClienteNome(orcamento.cliente_id)}</td>
                <td>{orcamento.referencia || '-'}</td>
                <td><Calendar size={16} /> {formatDate(orcamento.data_orcamento)}</td>
                <td>{formatCurrency(orcamento.valor_total)}</td>
                <td>
                    <span className="status-badge" style={{ backgroundColor: statusInfo.color }}>
                        {React.createElement(statusInfo.icon, { size: 14, style: { marginRight: '4px' } })}
                        {statusInfo.label}
                    </span>
                </td>
                <td>
                    <div className="action-buttons">
                        <button className="btn-action btn-edit" onClick={() => handleEdit(orcamento)} title="Editar"><Edit size={16} /></button>
                        <button className="btn-action btn-delete" onClick={() => handleDelete(orcamento)} title="Excluir"><Trash2 size={16} /></button>
                    </div>
                </td>
            </tr>
        );
    };

    if (loading) {
        return <div className="orcamentos-container"><div className="loading-overlay"><div className="loading-spinner"></div></div></div>;
    }

    return (
        <div className="orcamentos-container">
            {/* **ADICIONADO O TOASTER AQUI** */}
            <Toaster position="top-right" reverseOrder={false} />

            <div className="page-header">
                <h1><FileText size={24} /> Gerenciamento de Orçamentos</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={fetchData}><Clock size={16} /> Atualizar</button>
                    <button className="btn btn-primary" onClick={handleCreate}><Plus size={16} /> Novo Orçamento</button>
                </div>
            </div>

            <div className="filters-container">
                <div className="search-container">
                    <Search size={20} />
                    <input type="text" placeholder="Buscar..." className="search-input" value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} />
                </div>
                <div className="filter-controls">
                    <select className="filter-select" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                        <option value="">Todos os Status</option>
                        {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <button className="btn btn-secondary" onClick={resetFilters}><Filter size={16} /> Limpar</button>
                </div>
            </div>

            {totalRecords === 0 ? (
                <div className="empty-state">
                    <FileText size={48} />
                    <h3>Nenhum orçamento encontrado</h3>
                    <p>Tente ajustar os filtros ou crie um novo orçamento.</p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="orcamentos-table">
                            <thead>
                                <tr>
                                    <th>Número</th><th>Empresa</th><th>Cliente</th><th>Referência</th><th>Data</th><th>Valor Total</th><th>Status</th><th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedOrcamentos.map(orcamento => <OrcamentoRow key={orcamento.id} orcamento={orcamento} />)}
                            </tbody>
                        </table>
                    </div>
                    <div className="pagination-container">
                        <div className="pagination-info">
                            Mostrando {startIndex + 1} a {Math.min(endIndex, totalRecords)} de {totalRecords}
                        </div>
                        <div className="pagination-controls">
                            <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Anterior</button>
                            <span>Página {currentPage} de {totalPages}</span>
                            <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Próxima</button>
                        </div>
                    </div>
                </>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
                    <div className="modal-content-large">
                        <FormularioComponent
                            orcamento={editingOrcamento}
                            empresas={empresas}
                            clientes={clientes}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrcamentosPrincipal;

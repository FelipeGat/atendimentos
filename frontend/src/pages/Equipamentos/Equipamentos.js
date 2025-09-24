import React, { useState, useEffect } from 'react';
import { equipamentosAPI, clientesAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
import { useTableControls } from '../../hooks/useTableControls';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Equipamentos.css'; // Importa o CSS refatorado

const Equipamentos = () => {
    const [equipamentos, setEquipamentos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEquipamento, setEditingEquipamento] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        marca: '',
        modelo: '',
        numero_serie: '',
        patrimonio: '',
        cliente_id: '',
        descricao: '',
        data_aquisicao: '',
        valor_aquisicao: '',
        garantia_ate: '',
        localizacao: '',
        status: 1
    });

    const { message, showSuccess, showError } = useMessage();
    const {
        searchTerm,
        setSearchTerm,
        recordsPerPage,
        setRecordsPerPage,
        displayedData,
        handleSort,
        getSortIcon,
        filteredRecords,
        totalRecords
    } = useTableControls(equipamentos);

    // Carregar dados iniciais
    const fetchData = async () => {
        try {
            setLoading(true);
            const [equipamentosResult, clientesResult] = await Promise.all([
                equipamentosAPI.listar(),
                clientesAPI.listar()
            ]);

            setEquipamentos(equipamentosResult.data || []);
            setClientes(clientesResult.data || []);
        } catch (error) {
            showError('Erro ao carregar dados: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Criar novo equipamento
    const handleCreate = () => {
        setEditingEquipamento(null);
        setFormData({
            nome: '',
            marca: '',
            modelo: '',
            numero_serie: '',
            patrimonio: '',
            cliente_id: '',
            descricao: '',
            data_aquisicao: '',
            valor_aquisicao: '',
            garantia_ate: '',
            localizacao: '',
            status: 1
        });
        setShowModal(true);
    };

    // Editar equipamento
    const handleEdit = (equipamento) => {
        setEditingEquipamento(equipamento);
        setFormData({
            nome: equipamento.nome || '',
            marca: equipamento.marca || '',
            modelo: equipamento.modelo || '',
            numero_serie: equipamento.numero_serie || '',
            patrimonio: equipamento.patrimonio || '',
            cliente_id: equipamento.cliente_id || '',
            descricao: equipamento.descricao || '',
            data_aquisicao: equipamento.data_aquisicao || '',
            valor_aquisicao: equipamento.valor_aquisicao || '',
            garantia_ate: equipamento.garantia_ate || '',
            localizacao: equipamento.localizacao || '',
            status: parseInt(equipamento.status, 10),
        });
        setShowModal(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEquipamento(null);
        setFormData({
            nome: '',
            marca: '',
            modelo: '',
            numero_serie: '',
            patrimonio: '',
            cliente_id: '',
            descricao: '',
            data_aquisicao: '',
            valor_aquisicao: '',
            garantia_ate: '',
            localizacao: '',
            status: 1
        });
    };

    // Validar formulário
    const validateForm = () => {
        if (!formData.nome.trim()) {
            showError('Nome do equipamento é obrigatório');
            return false;
        }

        if (formData.valor_aquisicao && isNaN(parseFloat(formData.valor_aquisicao))) {
            showError('Valor de aquisição deve ser um número válido');
            return false;
        }

        return true;
    };

    // Salvar equipamento
    const handleSave = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            const dataToSave = {
                ...formData,
                nome: formData.nome.trim(),
                marca: formData.marca.trim(),
                modelo: formData.modelo.trim(),
                numero_serie: formData.numero_serie.trim(),
                patrimonio: formData.patrimonio.trim(),
                descricao: formData.descricao.trim(),
                localizacao: formData.localizacao.trim(),
                cliente_id: formData.cliente_id || null,
                valor_aquisicao: formData.valor_aquisicao ? parseFloat(formData.valor_aquisicao) : null,
                status: formData.status ? 1 : 0
            };

            if (editingEquipamento) {
                await equipamentosAPI.atualizar(editingEquipamento.id, dataToSave);
                showSuccess('Equipamento atualizado com sucesso');
            } else {
                await equipamentosAPI.criar(dataToSave);
                showSuccess('Equipamento criado com sucesso');
            }

            handleCloseModal();
            fetchData();
        } catch (error) {
            showError('Erro ao salvar equipamento: ' + error.message);
        }
    };

    // Excluir equipamento
    const handleDelete = async (equipamento) => {
        if (!window.confirm(`Tem certeza que deseja excluir o equipamento "${equipamento.nome}"?`)) {
            return;
        }

        try {
            await equipamentosAPI.excluir(equipamento.id);
            showSuccess('Equipamento excluído com sucesso');
            fetchData();
        } catch (error) {
            showError('Erro ao excluir equipamento: ' + error.message);
        }
    };

    // Obter nome do cliente
    const getClienteNome = (clienteId) => {
        const cliente = clientes.find(c => c.id === clienteId);
        return cliente ? cliente.nome : '-';
    };

    // Formatar valor monetário
    const formatCurrency = (value) => {
        if (!value) return '-';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Formatar data
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    };

    if (loading) {
        return <LoadingSpinner message="Carregando equipamentos..." />;
    }

    return (
        <div className="equipamentos-container">
            {/* Mensagem */}
            {message.text && (
                <div className={`message ${message.type}`}>
                    <span className="message-icon">
                        {message.type === 'success' ? '✅' : '❌'}
                    </span>
                    {message.text}
                </div>
            )}

            {/* Cabeçalho */}
            <div className="equipamentos-header">
                <h1>Gerenciamento de Equipamentos</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    ➕ Novo Equipamento
                </button>
            </div>

            {/* Conteúdo principal */}
            <div className="equipamentos-content">
                {/* Filtros e Busca */}
                <div className="table-controls">
                    <div className="control-group">
                        <div className="records-per-page">
                            <label htmlFor="recordsPerPage">Registros por página:</label>
                            <select
                                id="recordsPerPage"
                                value={recordsPerPage}
                                onChange={(e) => setRecordsPerPage(parseInt(e.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <div className="search-box">
                            <label htmlFor="search">🔍 Buscar:</label>
                            <input
                                type="text"
                                id="search"
                                placeholder="Digite para buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabela */}
                <div className="table-responsive">
                    <table className="equipamentos-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')}>
                                    ID {getSortIcon('id')}
                                </th>
                                <th onClick={() => handleSort('nome')}>
                                    Nome {getSortIcon('nome')}
                                </th>
                                <th onClick={() => handleSort('cliente_id')}>
                                    Cliente {getSortIcon('cliente_id')}
                                </th>
                                <th onClick={() => handleSort('marca')}>
                                    Marca {getSortIcon('marca')}
                                </th>
                                <th onClick={() => handleSort('modelo')}>
                                    Modelo {getSortIcon('modelo')}
                                </th>
                                <th onClick={() => handleSort('numero_serie')}>
                                    Nº Série {getSortIcon('numero_serie')}
                                </th>
                                <th onClick={() => handleSort('patrimonio')}>
                                    Patrimônio {getSortIcon('patrimonio')}
                                </th>
                                <th onClick={() => handleSort('status')}>
                                    Status {getSortIcon('status')}
                                </th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedData.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="no-records-found">
                                        {searchTerm ? '🔍 Nenhum registro encontrado para a busca.' : '📋 Nenhum equipamento encontrado.'}
                                    </td>
                                </tr>
                            ) : (
                                displayedData.map((equipamento) => (
                                    <tr key={equipamento.id}>
                                        <td>{equipamento.id}</td>
                                        <td>{equipamento.nome}</td>
                                        <td>{getClienteNome(equipamento.cliente_id)}</td>
                                        <td>{equipamento.marca || '-'}
                                        </td>
                                        <td>{equipamento.modelo || '-'}
                                        </td>
                                        <td>{equipamento.numero_serie || '-'}
                                        </td>
                                        <td>{equipamento.patrimonio || '-'}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${equipamento.status ? 'ativo' : 'inativo'}`}>
                                                {equipamento.status ? '✅ Ativo' : '❌ Inativo'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEdit(equipamento)}
                                                title="Editar equipamento"
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(equipamento)}
                                                title="Excluir equipamento"
                                            >
                                                🗑️ Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                <div className="pagination">
                    <div className="pagination-info">
                        Mostrando {displayedData.length} de {filteredRecords} registros
                        {searchTerm && ` (filtrado de ${totalRecords} registros totais)`}
                    </div>

                    {/* A paginação do useTableControls precisa ser adaptada aqui se houver mais de uma página */}
                    {/* Por enquanto, não há controles de página no useTableControls, apenas info */}
                </div>
            </div>

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {editingEquipamento ? '✏️ Editar Equipamento' : '➕ Novo Equipamento'}
                            </h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="modal-form" noValidate>
                            <div className="form-sections">
                                <div className="form-section">
                                    <h3 className="section-title">Informações do Equipamento</h3>
                                    <div className="form-grid">
                                        {/* Nome */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="nome">Nome *:</label>
                                            <span className="field-icon">💻</span>
                                            <input
                                                type="text"
                                                id="nome"
                                                name="nome"
                                                value={formData.nome}
                                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                                placeholder="Digite o nome do equipamento"
                                                required
                                            />
                                        </div>

                                        {/* Cliente */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="cliente_id">Cliente:</label>
                                            <span className="field-icon">👤</span>
                                            <select
                                                id="cliente_id"
                                                name="cliente_id"
                                                value={formData.cliente_id}
                                                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                                            >
                                                <option value="">Selecione um cliente</option>
                                                {clientes.map(cliente => (
                                                    <option key={cliente.id} value={cliente.id}>
                                                        {cliente.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Marca */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="marca">Marca:</label>
                                            <span className="field-icon">🏷️</span>
                                            <input
                                                type="text"
                                                id="marca"
                                                name="marca"
                                                value={formData.marca}
                                                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                                                placeholder="Ex: Dell, HP, Samsung"
                                            />
                                        </div>

                                        {/* Modelo */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="modelo">Modelo:</label>
                                            <span className="field-icon">⚙️</span>
                                            <input
                                                type="text"
                                                id="modelo"
                                                name="modelo"
                                                value={formData.modelo}
                                                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                                                placeholder="Ex: Latitude 7420, Galaxy S21"
                                            />
                                        </div>

                                        {/* Número de Série */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="numero_serie">Nº de Série:</label>
                                            <span className="field-icon">🔢</span>
                                            <input
                                                type="text"
                                                id="numero_serie"
                                                name="numero_serie"
                                                value={formData.numero_serie}
                                                onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                                                placeholder="Ex: ABC123XYZ"
                                            />
                                        </div>

                                        {/* Patrimônio */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="patrimonio">Patrimônio:</label>
                                            <span className="field-icon">🏢</span>
                                            <input
                                                type="text"
                                                id="patrimonio"
                                                name="patrimonio"
                                                value={formData.patrimonio}
                                                onChange={(e) => setFormData({ ...formData, patrimonio: e.target.value })}
                                                placeholder="Ex: PATR00123"
                                            />
                                        </div>

                                        {/* Data de Aquisição */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="data_aquisicao">Data de Aquisição:</label>
                                            <span className="field-icon">📅</span>
                                            <input
                                                type="date"
                                                id="data_aquisicao"
                                                name="data_aquisicao"
                                                value={formData.data_aquisicao}
                                                onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })}
                                            />
                                        </div>

                                        {/* Valor de Aquisição */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="valor_aquisicao">Valor de Aquisição:</label>
                                            <span className="field-icon">💰</span>
                                            <input
                                                type="number"
                                                id="valor_aquisicao"
                                                name="valor_aquisicao"
                                                value={formData.valor_aquisicao}
                                                onChange={(e) => setFormData({ ...formData, valor_aquisicao: e.target.value })}
                                                placeholder="Ex: 1500.00"
                                                step="0.01"
                                            />
                                        </div>

                                        {/* Garantia até */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="garantia_ate">Garantia até:</label>
                                            <span className="field-icon">🛡️</span>
                                            <input
                                                type="date"
                                                id="garantia_ate"
                                                name="garantia_ate"
                                                value={formData.garantia_ate}
                                                onChange={(e) => setFormData({ ...formData, garantia_ate: e.target.value })}
                                            />
                                        </div>

                                        {/* Localização */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="localizacao">Localização:</label>
                                            <span className="field-icon">📍</span>
                                            <input
                                                type="text"
                                                id="localizacao"
                                                name="localizacao"
                                                value={formData.localizacao}
                                                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                                                placeholder="Ex: Sala 101, Escritório Central"
                                            />
                                        </div>

                                        {/* Status */}
                                        <div className="form-group with-icon">
                                            <label htmlFor="status">Status:</label>
                                            <span className="field-icon">✅</span>
                                            <select
                                                id="status"
                                                name="status"
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) })}
                                            >
                                                <option value={1}>Ativo</option>
                                                <option value={0}>Inativo</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h3 className="section-title">Descrição</h3>
                                    <div className="form-grid">
                                        {/* Descrição */}
                                        <div className="form-group form-group-full">
                                            <label htmlFor="descricao">Descrição Detalhada:</label>
                                            <textarea
                                                id="descricao"
                                                name="descricao"
                                                value={formData.descricao}
                                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                                placeholder="Detalhes adicionais sobre o equipamento..."
                                                rows="4"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleCloseModal}
                                >
                                    ❌ Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    {editingEquipamento ? '💾 Atualizar' : '💾 Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Equipamentos;



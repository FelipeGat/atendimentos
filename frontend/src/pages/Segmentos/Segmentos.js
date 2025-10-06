import React, { useState, useEffect } from 'react';
import { segmentosAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
import { useTableControls } from '../../hooks/useTableControls';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Segmentos.css';


const Segmentos = () => {
    const [segmentos, setSegmentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSegmento, setEditingSegmento] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        ativo: 1
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
    } = useTableControls(segmentos);

    // Carregar segmentos
    const fetchSegmentos = async () => {
        try {
            setLoading(true);
            // Tenta obter o empresa_id do localStorage ou de um contexto global
            // Forçar empresaId=1 para ambiente de desenvolvimento
            const empresaId = 1;
            const headers = require('../../utils/api').getHeaders(empresaId);
            console.log('Debug - Headers enviados na listagem:', headers);
            const result = await segmentosAPI.listar({ empresaId });
            console.log('Debug - Resultado da API:', result);
            setSegmentos(result.data || []);
            console.log('Debug - Segmentos definidos:', result.data || []);
            console.log('Debug - Estado após setSegmentos:', [...(result.data || [])]);
        } catch (error) {
            console.error('Erro ao carregar segmentos:', error);
            showError('Erro ao carregar segmentos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSegmentos();
    }, []);

    // Criar novo segmento
    const handleCreate = () => {
        setEditingSegmento(null);
        setFormData({ nome: '', descricao: '', ativo: 1 });
        setShowModal(true);
    };

    // Editar segmento
    const handleEdit = (segmento) => {
        setEditingSegmento(segmento);
        setFormData({
            nome: segmento.nome,
            descricao: segmento.descricao || '',
            ativo: segmento.ativo
        });
        setShowModal(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingSegmento(null);
        setFormData({ nome: '', descricao: '', ativo: 1 });
    };

    // Salvar segmento
    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.nome.trim()) {
            showError('Nome é obrigatório');
            return;
        }

        try {
            // Forçar empresaId=1 para ambiente de desenvolvimento
            const empresaId = 1;
            let dataToSend = { ...formData, empresa_id: empresaId };
            if (editingSegmento) {
                // Adiciona o id ao corpo da requisição para atualização
                dataToSend = { ...dataToSend, id: editingSegmento.id };
                await segmentosAPI.atualizar(editingSegmento.id, dataToSend);
                showSuccess('Segmento atualizado com sucesso');
            } else {
                await segmentosAPI.criar(dataToSend);
                showSuccess('Segmento criado com sucesso');
            }

            handleCloseModal();
            fetchSegmentos();
        } catch (error) {
            console.error('Erro ao salvar segmento:', error);
            showError('Erro ao salvar segmento: ' + error.message);
        }
    };

    // Excluir segmento
    const handleDelete = async (segmento) => {
        if (!window.confirm(`Tem certeza que deseja excluir o segmento "${segmento.nome}"?`)) {
            return;
        }

        try {
            // Forçar empresaId=1 para ambiente de desenvolvimento
            const empresaId = 1;
            const response = await segmentosAPI.excluir(segmento.id, empresaId);
            console.log('Resposta da exclusão:', response);
            if (response && response.success === false) {
                showError('Erro ao excluir segmento: ' + (response.error || response.message || 'Erro desconhecido.'));
            } else {
                showSuccess('Segmento excluído com sucesso');
                fetchSegmentos();
            }
        } catch (error) {
            console.error('Erro ao excluir segmento:', error);
            showError('Erro ao excluir segmento: ' + (error.message || error));
        }
    };

    if (loading) {
        return <LoadingSpinner message="Carregando segmentos..." />;
    }

    return (
        <div className="segmentos-container">
            {/* Mensagem */}
            {message.text && <Message type={message.type} text={message.text} />}

            {/* Cabeçalho */}
            <div className="segmentos-header">
                <h1>Gerenciamento de Segmentos</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    ➕ Novo Segmento
                </button>
            </div>

            {/* Conteúdo principal */}
            <div className="segmentos-content">
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
                    <table className="segmentos-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')}>
                                    ID {getSortIcon('id')}
                                </th>
                                <th onClick={() => handleSort('nome')}>
                                    Nome {getSortIcon('nome')}
                                </th>
                                <th onClick={() => handleSort('descricao')}>
                                    Descrição {getSortIcon('descricao')}
                                </th>
                                <th onClick={() => handleSort('ativo')}>
                                    Status {getSortIcon('ativo')}
                                </th>
                                <th onClick={() => handleSort('criado_em')}>
                                    Criado em {getSortIcon('criado_em')}
                                </th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="no-records-found">
                                        {searchTerm ? '🔍 Nenhum registro encontrado para a busca.' : '📋 Nenhum segmento encontrado.'}
                                    </td>
                                </tr>
                            ) : (
                                displayedData.map((segmento) => (
                                    <tr key={segmento.id}>
                                        <td>{segmento.id}</td>
                                        <td>{segmento.nome}</td>
                                        <td>{segmento.descricao || '-'}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${segmento.ativo ? 'ativo' : 'inativo'}`}>
                                                {segmento.ativo ? '✅ Ativo' : '❌ Inativo'}
                                            </span>
                                        </td>
                                        <td>{new Date(segmento.criado_em).toLocaleDateString('pt-BR')}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEdit(segmento)}
                                                title="Editar segmento"
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(segmento)}
                                                title="Excluir segmento"
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
                                {editingSegmento ? '✏️ Editar Segmento' : '➕ Novo Segmento'}
                            </h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="modal-form" noValidate>
                            <div className="form-group">
                                <label htmlFor="nome">Nome do Segmento:</label>
                                <input
                                    type="text"
                                    id="nome"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Digite o nome do segmento"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="descricao">Descrição:</label>
                                <textarea
                                    id="descricao"
                                    name="descricao"
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                    placeholder="Digite a descrição do segmento"
                                    rows="3"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="ativo">Status:</label>
                                <select
                                    id="ativo"
                                    name="ativo"
                                    value={formData.ativo}
                                    onChange={(e) => setFormData({ ...formData, ativo: parseInt(e.target.value) })}
                                >
                                    <option value={1}>✅ Ativo</option>
                                    <option value={0}>❌ Inativo</option>
                                </select>
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
                                    {editingSegmento ? '💾 Atualizar' : '💾 Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Segmentos;



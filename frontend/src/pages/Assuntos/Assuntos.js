import React, { useState, useEffect } from 'react';
import { assuntosAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
import { useTableControls } from '../../hooks/useTableControls';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Assuntos.css';

const Assuntos = () => {
    const [assuntos, setAssuntos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAssunto, setEditingAssunto] = useState(null);
    const [formData, setFormData] = useState({ nome: '' });

    // Função para formatar datas de forma segura
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('pt-BR');
    };

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
    } = useTableControls(assuntos);

    // Carregar assuntos
    const fetchAssuntos = async () => {
        try {
            setLoading(true);
            const result = await assuntosAPI.listar();
            setAssuntos(result.data || []);
        } catch (error) {
            showError('Erro ao carregar assuntos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssuntos();
    }, []);

    // Criar novo assunto
    const handleCreate = () => {
        setEditingAssunto(null);
        setFormData({ nome: '' });
        setShowModal(true);
    };

    // Editar assunto
    const handleEdit = (assunto) => {
        setEditingAssunto(assunto);
        setFormData({ nome: assunto.nome });
        setShowModal(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingAssunto(null);
        setFormData({ nome: '' });
    };

    // Salvar assunto
    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.nome.trim()) {
            showError('Nome é obrigatório');
            return;
        }

        try {
            if (editingAssunto) {
                await assuntosAPI.atualizar(editingAssunto.id, formData);
                showSuccess('Assunto atualizado com sucesso');
                // Atualizar o assunto existente na lista mantendo a data original de criação
                setAssuntos(prevAssuntos => 
                    prevAssuntos.map(assunto => 
                        assunto.id === editingAssunto.id 
                            ? { ...assunto, ...formData, criado_em: assunto.criado_em } 
                            : assunto
                    )
                );
            } else {
                const response = await assuntosAPI.criar(formData);
                showSuccess('Assunto criado com sucesso');
                
                // Usar dados retornados pela API ou criar fallback
                if (response.data && response.data.id) {
                    // API retornou os dados completos - usar diretamente
                    setAssuntos(prevAssuntos => [...prevAssuntos, response.data]);
                } else {
                    // Fallback: recarregar a lista completa
                    await fetchAssuntos();
                }
            }

            handleCloseModal();
            
        } catch (error) {
            showError('Erro ao salvar assunto: ' + error.message);
        }
    };

    // Excluir assunto (soft delete)
    const handleDelete = async (assunto) => {
        if (!window.confirm(`Tem certeza que deseja remover o assunto "${assunto.nome}"? O assunto será ocultado mas mantido no sistema.`)) {
            return;
        }

        try {
            await assuntosAPI.excluir(assunto.id);
            showSuccess('Assunto removido com sucesso');
            // Remover o assunto da lista atual
            setAssuntos(prevAssuntos => 
                prevAssuntos.filter(item => item.id !== assunto.id)
            );
            
        } catch (error) {
            showError('Erro ao remover assunto: ' + error.message);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Carregando assuntos..." />;
    }

    return (
        <div className="assuntos-container">
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
            <div className="assuntos-header">
                <h1>Gerenciamento de Assuntos</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    ➕ Novo Assunto
                </button>
            </div>

            {/* Conteúdo principal */}
            <div className="assuntos-content">
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
                    <table className="assuntos-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')}>
                                    ID {getSortIcon('id')}
                                </th>
                                <th onClick={() => handleSort('nome')}>
                                    Nome {getSortIcon('nome')}
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
                                    <td colSpan="4" className="no-records-found">
                                        {searchTerm ? '🔍 Nenhum registro encontrado para a busca.' : '📋 Nenhum assunto encontrado.'}
                                    </td>
                                </tr>
                            ) : (
                                displayedData.map((assunto) => (
                                    <tr key={assunto.id}>
                                        <td>{assunto.id}</td>
                                        <td>{assunto.nome}</td>
                                        <td>{formatDate(assunto.criado_em)}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEdit(assunto)}
                                                title="Editar assunto"
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(assunto)}
                                                title="Remover assunto"
                                            >
                                                🗑️ Remover
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
                                {editingAssunto ? '✏️ Editar Assunto' : '➕ Novo Assunto'}
                            </h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="modal-form" noValidate>
                            <div className="form-group">
                                <label htmlFor="nome">Nome do Assunto:</label>
                                <input
                                    type="text"
                                    id="nome"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Digite o nome do assunto"
                                    required
                                />
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
                                    {editingAssunto ? '💾 Atualizar' : '💾 Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assuntos;



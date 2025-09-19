import React, { useState, useEffect } from 'react';
import { usuariosAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
import { useTableControls } from '../../hooks/useTableControls';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Usuarios.css';

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        cpf: '',
        email: '',
        telefone: '',
        senha: '',
        perfil: 'Usuario',
        bloqueado: 0,
        foto: ''
    });

    // Estados para controle das APIs
    const [documentoLoading, setDocumentoLoading] = useState(false);
    const [documentoError, setDocumentoError] = useState('');

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
    } = useTableControls(usuarios);

    const perfisDisponiveis = ['Admin', 'Tecnico', 'Usuario'];

    // Carregar dados iniciais
    const fetchData = async () => {
        try {
            setLoading(true);
            const usuariosResult = await usuariosAPI.listar();
            setUsuarios(usuariosResult.data || []);
        } catch (error) {
            showError('Erro ao carregar dados: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Função para consultar CPF
    const consultarCPF = async (cpf) => {
        const cpfLimpo = cpf.replace(/\D/g, '');

        if (cpfLimpo.length !== 11) {
            return;
        }

        setDocumentoLoading(true);
        setDocumentoError('');

        try {
            // Simulação de consulta de CPF (não há API pública gratuita para CPF)
            // Em um cenário real, você implementaria a validação do CPF aqui
            setDocumentoError('A consulta de CPF não está disponível.');
        } catch (error) {
            setDocumentoError('Erro ao consultar CPF. Tente novamente.');
            console.error('Erro na consulta de CPF:', error);
        } finally {
            setDocumentoLoading(false);
        }
    };

    // Criar novo usuário
    const handleCreate = () => {
        setEditingUsuario(null);
        setFormData({
            nome: '',
            cpf: '',
            email: '',
            telefone: '',
            senha: '',
            perfil: 'Usuario',
            bloqueado: 0,
            foto: ''
        });
        setDocumentoError('');
        setShowModal(true);
    };

    // Editar usuário
    const handleEdit = (usuario) => {
        setEditingUsuario(usuario);
        setFormData({
            nome: usuario.nome || '',
            cpf: usuario.cpf || '',
            email: usuario.email || '',
            telefone: usuario.telefone || '',
            senha: '',
            perfil: usuario.perfil || 'Usuario',
            bloqueado: usuario.bloqueado ? 1 : 0,
            foto: usuario.foto || ''
        });
        setDocumentoError('');
        setShowModal(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUsuario(null);
        setFormData({
            nome: '',
            cpf: '',
            email: '',
            telefone: '',
            senha: '',
            perfil: 'Usuario',
            bloqueado: 0,
            foto: ''
        });
        setDocumentoError('');
    };

    // Validar formulário
    const validateForm = () => {
        if (!formData.nome.trim()) {
            showError('Nome é obrigatório');
            return false;
        }

        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            showError('Email inválido');
            return false;
        }

        if (!editingUsuario && (!formData.senha || formData.senha.length < 6)) {
            showError('Senha deve ter pelo menos 6 caracteres');
            return false;
        }

        const cpfLimpo = formData.cpf.replace(/\D/g, '');
        if (formData.cpf && cpfLimpo.length !== 11) {
            showError('CPF inválido');
            return false;
        }

        return true;
    };

    // Salvar usuário
    const handleSave = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            const form = new FormData();
            form.append('nome', formData.nome.trim());
            form.append('cpf', formData.cpf.replace(/\D/g, ''));
            form.append('email', formData.email.trim());
            form.append('telefone', formData.telefone.trim());
            form.append('perfil', formData.perfil);
            form.append('bloqueado', formData.bloqueado);

            if (formData.senha) {
                form.append('senha', formData.senha);
            }
            if (formData.foto instanceof File) {
                form.append('foto', formData.foto);
            }

            if (editingUsuario) {
                await usuariosAPI.atualizar(editingUsuario.id, form);
                showSuccess('Usuário atualizado com sucesso');
            } else {
                await usuariosAPI.criar(form);
                showSuccess('Usuário criado com sucesso');
            }

            handleCloseModal();
            fetchData();
        } catch (error) {
            showError('Erro ao salvar usuário: ' + error.message);
        }
    };


    // Excluir usuário
    const handleDelete = async (usuario) => {
        if (!window.confirm(`Tem certeza que deseja excluir o usuário "${usuario.nome}"?`)) {
            return;
        }

        try {
            await usuariosAPI.excluir(usuario.id);
            showSuccess('Usuário excluído com sucesso');
            fetchData();
        } catch (error) {
            showError('Erro ao excluir usuário: ' + error.message);
        }
    };

    // Formatar CPF
    const formatCPF = (value) => {
        const numbers = value.replace(/\D/g, '');
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .slice(0, 14);
    };

    if (loading) {
        return <LoadingSpinner message="Carregando usuários..." />;
    }

    return (
        <div className="usuarios-container">
            <div className="usuarios-header">
                <h1>Gerenciamento de Usuários</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    Novo Usuário
                </button>
            </div>

            <Message message={message} />

            <div className="usuarios-content">
                <div className="table-controls">
                    <div className="table-controls-left">
                        <div className="records-per-page">
                            <label htmlFor="recordsPerPage">Mostrar últimos:</label>
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
                            <span>registros</span>
                        </div>
                    </div>

                    <div className="table-controls-right">
                        <div className="search-box">
                            <label htmlFor="search">Buscar Registro:</label>
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

                <div className="table-container">
                    <table className="usuarios-table">
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => handleSort('id')}>
                                    ID {getSortIcon('id')}
                                </th>
                                <th className="sortable" onClick={() => handleSort('nome')}>
                                    Nome {getSortIcon('nome')}
                                </th>
                                <th className="sortable" onClick={() => handleSort('email')}>
                                    Email {getSortIcon('email')}
                                </th>
                                <th className="sortable" onClick={() => handleSort('telefone')}>
                                    Telefone {getSortIcon('telefone')}
                                </th>
                                <th className="sortable" onClick={() => handleSort('cpf')}>
                                    CPF {getSortIcon('cpf')}
                                </th>
                                <th className="sortable" onClick={() => handleSort('perfil')}>
                                    Perfil {getSortIcon('perfil')}
                                </th>
                                <th className="sortable" onClick={() => handleSort('bloqueado')}>
                                    Status {getSortIcon('bloqueado')}
                                </th>
                                <th className="sortable" onClick={() => handleSort('criado_em')}>
                                    Criado em {getSortIcon('criado_em')}
                                </th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedData.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="no-data">
                                        {searchTerm ? 'Nenhum registro encontrado para a busca' : 'Nenhum usuário encontrado'}
                                    </td>
                                </tr>
                            ) : (
                                displayedData.map((usuario) => (
                                    <tr key={usuario.id}>
                                        <td>{usuario.id}</td>
                                        <td>{usuario.nome}</td>
                                        <td>{usuario.email || '–'}</td>
                                        <td>{usuario.telefone || '–'}</td>
                                        <td>{usuario.cpf ? formatCPF(usuario.cpf) : '–'}</td>
                                        <td>{usuario.perfil}</td>
                                        <td>
                                            <span className={`status ${usuario.bloqueado ? 'inativo' : 'ativo'}`}>
                                                {usuario.bloqueado ? 'Bloqueado' : 'Ativo'}
                                            </span>
                                        </td>
                                        <td>{new Date(usuario.criado_em).toLocaleDateString('pt-BR')}</td>
                                        <td className="actions">
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEdit(usuario)}
                                                title="Editar usuário"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(usuario)}
                                                title="Excluir usuário"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="table-info">
                    Mostrando {displayedData.length} de {filteredRecords} registros
                    {searchTerm && ` (filtrados de ${totalRecords} registros)`}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                            <button className="btn-close" onClick={handleCloseModal}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-grid">
                                {/* Nome */}
                                <div className="form-group with-icon">
                                    <label htmlFor="nome">Nome: *</label>
                                    <span className="field-icon">👤</span>
                                    <input
                                        type="text"
                                        id="nome"
                                        value={formData.nome}
                                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                        placeholder="Digite o nome completo"
                                        required
                                    />
                                </div>

                                {/* CPF */}
                                <div className="form-group with-icon">
                                    <label htmlFor="cpf">CPF:</label>
                                    <span className="field-icon">📄</span>
                                    <input
                                        type="text"
                                        id="cpf"
                                        value={formData.cpf}
                                        onChange={(e) => {
                                            const formatted = formatCPF(e.target.value);
                                            setFormData({ ...formData, cpf: formatted });
                                        }}
                                        onBlur={(e) => consultarCPF(e.target.value)}
                                        placeholder="Digite o CPF"
                                        className={documentoLoading ? 'loading' : ''}
                                    />
                                    {documentoError && <div className="api-error">{documentoError}</div>}
                                </div>

                                {/* Email */}
                                <div className="form-group with-icon">
                                    <label htmlFor="email">Email: *</label>
                                    <span className="field-icon">📧</span>
                                    <input
                                        type="email"
                                        id="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="Digite o email"
                                        required
                                    />
                                </div>

                                {/* Telefone */}
                                <div className="form-group with-icon">
                                    <label htmlFor="telefone">Telefone:</label>
                                    <span className="field-icon">📞</span>
                                    <input
                                        type="tel"
                                        id="telefone"
                                        value={formData.telefone}
                                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                        placeholder="Digite o telefone"
                                    />
                                </div>

                                {/* Perfil */}
                                <div className="form-group with-icon">
                                    <label htmlFor="perfil">Perfil: *</label>
                                    <span className="field-icon">👑</span>
                                    <select
                                        id="perfil"
                                        value={formData.perfil}
                                        onChange={(e) => setFormData({ ...formData, perfil: e.target.value })}
                                        required
                                    >
                                        {perfisDisponiveis.map((p) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status */}
                                <div className="form-group with-icon">
                                    <label htmlFor="bloqueado">Status:</label>
                                    <span className="field-icon">🔒</span>
                                    <select
                                        id="bloqueado"
                                        value={formData.bloqueado}
                                        onChange={(e) => setFormData({ ...formData, bloqueado: parseInt(e.target.value) })}
                                    >
                                        <option value={0}>Ativo</option>
                                        <option value={1}>Bloqueado</option>
                                    </select>
                                </div>

                                {/* Senha */}
                                <div className="form-group form-group-full with-icon">
                                    <label htmlFor="senha">
                                        Senha: {!editingUsuario && '*'} {editingUsuario && "(deixe em branco para não alterar)"}
                                    </label>
                                    <span className="field-icon">🔑</span>
                                    <input
                                        type="password"
                                        id="senha"
                                        value={formData.senha}
                                        onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                                        placeholder="Digite a senha"
                                        required={!editingUsuario}
                                    />
                                </div>

                                {/* Foto */}
                                <div className="form-group form-group-full with-icon">
                                    <label htmlFor="foto">Foto do Usuário:</label>
                                    <span className="field-icon">📷</span>
                                    <input
                                        type="file"
                                        id="foto"
                                        accept="image/*"
                                        onChange={(e) => setFormData({ ...formData, foto: e.target.files[0] })}
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingUsuario ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usuarios;


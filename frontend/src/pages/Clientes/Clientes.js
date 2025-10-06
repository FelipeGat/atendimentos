import React, { useState, useEffect } from 'react';
import { clientesAPI, segmentosAPI } from '../../utils/api';
import { useMessage } from '../../hooks/useMessage';
import { useTableControls } from '../../hooks/useTableControls';
import Message from '../../components/Message';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Clientes.css'; // Importa o CSS refatorado

const Clientes = () => {
    const [clientes, setClientes] = useState([]);
    const [segmentos, setSegmentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCliente, setEditingCliente] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        cpf_cnpj: '',
        logradouro: '',
        numero: '',
        cidade: '',
        estado: '',
        cep: '',
        segmentos_ids: [],
        observacoes: '',
        ativo: 1
    });
    // Estados para controle das APIs
    const [documentoLoading, setDocumentoLoading] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const [documentoError, setDocumentoError] = useState('');
    const [cepError, setCepError] = useState('');
    
    

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
    } = useTableControls(clientes);

    // Carregar dados iniciais
    const fetchData = async () => {
        try {
            setLoading(true);
            // Forçar empresaId=1 para ambiente de desenvolvimento
            const empresaId = 1; // Forçar empresaId=1 para ambiente de desenvolvimento
            const [clientesResult, segmentosResult] = await Promise.all([
                clientesAPI.listar({ empresaId }),
                segmentosAPI.listar({ empresaId })
            ]);

            setClientes(clientesResult.data || []);
            setSegmentos(segmentosResult.data || []);
        } catch (error) {
            showError('Erro ao carregar dados: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Função para consultar CPF/CNPJ
    const consultarDocumento = async (documento) => {
        const documentoLimpo = documento.replace(/\D/g, '');

        if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
            return;
        }

        setDocumentoLoading(true);
        setDocumentoError('');

        try {
            let response, data;
            if (documentoLimpo.length === 14) { // CNPJ
                response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${documentoLimpo}`);
                data = await response.json();

                if (data.status === 'ERROR') {
                    setDocumentoError('CNPJ não encontrado ou inválido');
                    return;
                }

                setFormData(prev => ({
                    ...prev,
                    nome: prev.nome || data.nome || data.fantasia || '',
                    email: prev.email || data.email || '',
                    telefone: prev.telefone || data.telefone || '',
                    logradouro: `${data.logradouro || ''} ${data.numero || ''} ${data.complemento || ''}`.trim(),
                    cidade: data.municipio || '',
                    estado: data.uf || '',
                    cep: data.cep ? data.cep.replace(/\D/g, '') : ''
                }));
            } else { // CPF (API fictícia, pois não há API pública e gratuita para CPF)
                setDocumentoError('A consulta de CPF não está disponível.');
            }

        } catch (error) {
            setDocumentoError('Erro ao consultar documento. Tente novamente.');
            console.error('Erro na consulta de documento:', error);
        } finally {
            setDocumentoLoading(false);
        }
    };

    // Função para consultar CEP na API dos Correios
    const consultarCEP = async (cep) => {
        if (!cep || cep.replace(/\D/g, '').length !== 8) {
            return;
        }

        setCepLoading(true);
        setCepError('');

        try {
            const cepLimpo = cep.replace(/\D/g, '');
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();

            if (data.erro) {
                setCepError('CEP não encontrado');
                return;
            }

            setFormData(prev => ({
                ...prev,
                logradouro: prev.logradouro || data.logradouro || '',
                cidade: data.localidade || '',
                estado: data.uf || ''
            }));

        } catch (error) {
            setCepError('Erro ao consultar CEP. Tente novamente.');
            console.error('Erro na consulta CEP:', error);
        } finally {
            setCepLoading(false);
        }
    };

    // Criar novo cliente
    const handleCreate = () => {
        setEditingCliente(null);
        setFormData({
            nome: '',
            email: '',
            telefone: '',
            cpf_cnpj: '',
            logradouro: '',
            numero: '',
            cidade: '',
            estado: '',
            cep: '',
            segmentos_ids: [],
            observacoes: '',
            ativo: 1
        });
        setDocumentoError('');
        setCepError('');
        setShowModal(true);
    };

    // Editar cliente
    const handleEdit = (cliente) => {
        setEditingCliente(cliente);
        setFormData({
            nome: cliente.nome || '',
            email: cliente.email || '',
            telefone: cliente.telefone || '',
            cpf_cnpj: cliente.cpf_cnpj || '',
            logradouro: cliente.logradouro || '',
            numero: cliente.numero || '',
            cidade: cliente.cidade || '',
            estado: cliente.estado || '',
            cep: cliente.cep || '',
            segmentos_ids: cliente.segmentos_ids || [],
            observacoes: cliente.observacoes || '',
            ativo: cliente.ativo
        });
        setDocumentoError('');
        setCepError('');
        setShowModal(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCliente(null);
        setFormData({
            nome: '',
            email: '',
            telefone: '',
            cpf_cnpj: '',
            logradouro: '',
            numero: '',
            cidade: '',
            estado: '',
            cep: '',
            segmentos_ids: [],
            observacoes: '',
            ativo: 1
        });
        setDocumentoError('');
        setCepError('');
    };

    // Validar formulário
    const validateForm = () => {
        if (!formData.nome.trim()) {
            showError('Nome é obrigatório');
            return false;
        }

        if (!formData.cpf_cnpj.trim()) {
            showError('CPF/CNPJ é obrigatório');
            return false;
        }

        if (!formData.telefone.trim()) {
            showError('Telefone é obrigatório');
            return false;
        }

        if (formData.email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
            showError('Email inválido');
            return false;
        }

        const documentoLimpo = formData.cpf_cnpj.replace(/\D/g, '');
        if (documentoLimpo && documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
            showError('CPF/CNPJ inválido');
            return false;
        }

        if (formData.cep && !/^\d{5}-?\d{3}$/.test(formData.cep)) {
            showError('CEP inválido (formato: 12345-678)');
            return false;
        }

        return true;
    };

    // Salvar cliente
    const handleSave = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            const empresaId = 1; // Forçar empresaId=1 para ambiente de desenvolvimento
            const dataToSave = {
                ...formData,
                id: editingCliente ? editingCliente.id : undefined,
                nome: formData.nome.trim(),
                email: formData.email.trim(),
                telefone: formData.telefone.trim(),
                cpf_cnpj: formData.cpf_cnpj.replace(/\D/g, ''),
                logradouro: formData.logradouro.trim(),
                numero: formData.numero.trim(),
                cidade: formData.cidade.trim(),
                estado: formData.estado.trim(),
                cep: formData.cep.replace(/\D/g, ''),
                observacoes: formData.observacoes.trim(),
                segmentos_ids: formData.segmentos_ids.map(id => parseInt(id)),
                empresa_id: empresaId
            };

            if (editingCliente) {
                await clientesAPI.atualizar(editingCliente.id, dataToSave, { empresaId });
                showSuccess('Cliente atualizado com sucesso');
            } else {
                // Remover o ID do objeto de dados para criação (não é necessário)
                delete dataToSave.id;
                await clientesAPI.criar(dataToSave, { empresaId });
                showSuccess('Cliente criado com sucesso');
            }

            handleCloseModal();
            await fetchData(); // Aguardar o carregamento dos dados após salvar
        } catch (error) {
            // Certificar que o erro apareça acima do modal
            console.error('Erro ao salvar cliente:', error);
            showError('Erro ao salvar cliente: ' + error.message);
        }
    };

    // Excluir cliente
    const handleDelete = async (cliente) => {
        if (!window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?`)) {
            return;
        }

        try {
            const empresaId = 1; // Forçar empresaId=1 para ambiente de desenvolvimento
            await clientesAPI.excluir(cliente.id, empresaId);
            showSuccess('Cliente excluído com sucesso');
            fetchData();
        } catch (error) {
            showError('Erro ao excluir cliente: ' + error.message);
        }
    };



    // Formatar CPF/CNPJ
    const formatDocumento = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) { // CPF
            return numbers
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .slice(0, 14);
        } else { // CNPJ
            return numbers
                .replace(/(\d{2})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .slice(0, 18);
        }
    };

    // Formatar CEP
    const formatCep = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 5) {
            return numbers;
        }
        return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
    };

    // Obter nome do segmento
    const getSegmentoNome = (segmentoId) => {
        const segmento = segmentos.find(s => s.id === segmentoId);
        return segmento ? segmento.nome : '–';
    };

    if (loading) {
        return <LoadingSpinner message="Carregando clientes..." />;
    }

    return (
        <div className="clientes-container">
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
            <div className="clientes-header">
                <h1>Gerenciamento de Clientes</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    ➕ Novo Cliente
                </button>
            </div>

            {/* Conteúdo principal */}
            <div className="clientes-content">
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
                    <table className="clientes-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')}>
                                    ID {getSortIcon('id')}
                                </th>
                                <th onClick={() => handleSort('nome')}>
                                    Nome {getSortIcon('nome')}
                                </th>
                                <th onClick={() => handleSort('email')}>
                                    Email {getSortIcon('email')}
                                </th>
                                <th onClick={() => handleSort('telefone')}>
                                    Telefone {getSortIcon('telefone')}
                                </th>
                                <th onClick={() => handleSort('cpf_cnpj')}>
                                    CPF/CNPJ {getSortIcon('cpf_cnpj')}
                                </th>
                                <th onClick={() => handleSort('cidade')}>
                                    Cidade {getSortIcon('cidade')}
                                </th>
                                <th onClick={() => handleSort('segmentos_ids')}>
                                    Segmento {getSortIcon('segmentos_ids')}
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
                                    <td colSpan="10" className="no-records-found">
                                        {searchTerm ? '🔍 Nenhum registro encontrado para a busca.' : '📋 Nenhum cliente encontrado.'}
                                    </td>
                                </tr>
                            ) : (
                                displayedData.map((cliente) => (
                                    <tr key={cliente.id}>
                                        <td>{cliente.id}</td>
                                        <td>{cliente.nome}</td>
                                        <td>{cliente.email || '–'}</td>
                                        <td>{cliente.telefone || '–'}</td>
                                        <td>{cliente.cpf_cnpj ? formatDocumento(cliente.cpf_cnpj) : '–'}</td>
                                        <td>{cliente.cidade || '–'}</td>
                                        <td>
                                            {cliente.segmentos_ids && cliente.segmentos_ids.length > 0
                                                ? cliente.segmentos_ids.map(id => getSegmentoNome(id)).join(', ')
                                                : '–'}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${cliente.ativo ? 'ativo' : 'inativo'}`}>
                                                {cliente.ativo ? '✅ Ativo' : '❌ Inativo'}
                                            </span>
                                        </td>
                                        <td>{new Date(cliente.criado_em).toLocaleDateString('pt-BR')}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEdit(cliente)}
                                                title="Editar cliente"
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(cliente)}
                                                title="Excluir cliente"
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
                                {editingCliente ? '✏️ Editar Cliente' : '➕ Novo Cliente'}
                            </h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="modal-form" noValidate>
                            <div className="form-sections">
                                <div className="form-section">
                                    <h3 className="section-title">Informações Básicas</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="nome">Nome/Razão Social: *</label>
                                            <input
                                                type="text"
                                                id="nome"
                                                name="nome"
                                                value={formData.nome}
                                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                                placeholder="Nome ou Razão Social do Cliente (obrigatório)"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="email">Email:</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="email@exemplo.com"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="telefone">Telefone: *</label>
                                            <input
                                                type="text"
                                                id="telefone"
                                                name="telefone"
                                                value={formData.telefone}
                                                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                                placeholder="(XX) XXXXX-XXXX (obrigatório)"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="cpf_cnpj">CPF/CNPJ: *</label>
                                            <input
                                                type="text"
                                                id="cpf_cnpj"
                                                name="cpf_cnpj"
                                                value={formatDocumento(formData.cpf_cnpj)}
                                                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                                                onBlur={(e) => consultarDocumento(e.target.value)}
                                                placeholder="CPF ou CNPJ (obrigatório)"
                                            />
                                            {documentoLoading && <span className="loading-spinner"></span>}
                                            {documentoError && <span className="api-error">{documentoError}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h3 className="section-title">Endereço</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="cep">CEP:</label>
                                            <input
                                                type="text"
                                                id="cep"
                                                name="cep"
                                                value={formatCep(formData.cep)}
                                                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                                                onBlur={(e) => consultarCEP(e.target.value)}
                                                placeholder="XXXXX-XXX"
                                            />
                                            {cepLoading && <span className="loading-spinner"></span>}
                                            {cepError && <span className="api-error">{cepError}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="logradouro">Logradouro:</label>
                                            <input
                                                type="text"
                                                id="logradouro"
                                                name="logradouro"
                                                value={formData.logradouro}
                                                onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                                                placeholder="Rua, Avenida, etc."
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="numero">Número:</label>
                                            <input
                                                type="text"
                                                id="numero"
                                                name="numero"
                                                value={formData.numero}
                                                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                                placeholder="123"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="cidade">Cidade:</label>
                                            <input
                                                type="text"
                                                id="cidade"
                                                name="cidade"
                                                value={formData.cidade}
                                                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                                placeholder="Cidade"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="estado">Estado:</label>
                                            <input
                                                type="text"
                                                id="estado"
                                                name="estado"
                                                value={formData.estado}
                                                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                                placeholder="UF"
                                                maxLength="2"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h3 className="section-title">Outras Informações</h3>
                                    <div className="form-grid">
                                        <div className="form-group form-group-full">
                                            <label htmlFor="segmentos_ids">Segmentos:</label>
                                            <select
                                                id="segmentos_ids"
                                                name="segmentos_ids"
                                                multiple
                                                value={formData.segmentos_ids}
                                                onChange={(e) => {
                                                    const options = Array.from(e.target.options);
                                                    const value = options.filter(option => option.selected).map(option => option.value);
                                                    setFormData({ ...formData, segmentos_ids: value });
                                                }}
                                            >
                                                {segmentos.map(seg => (
                                                    <option key={seg.id} value={seg.id}>{seg.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group form-group-full">
                                            <label htmlFor="observacoes">Observações:</label>
                                            <textarea
                                                id="observacoes"
                                                name="observacoes"
                                                value={formData.observacoes}
                                                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                                placeholder="Observações adicionais sobre o cliente"
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
                                    {editingCliente ? '💾 Atualizar' : '💾 Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clientes;



import React, { useState, useEffect } from 'react';
import { produtosServicosAPI } from '../../utils/api';
import './ProdutosServicos.css';

const ProdutosServicos = () => {
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduto, setEditingProduto] = useState(null);
    const [abaAtiva, setAbaAtiva] = useState('basicas'); // 'basicas' ou 'nfe'
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [formData, setFormData] = useState({
        codigo: '',
        codigo_barras: '',
        finalidade: 'venda',
        nome: '',
        tipo: 'produto',
        tipo_unidade: 'UN',
        estoque_minimo: '0',
        estoque_atual: '0',
        custo: '0',
        margem: '0',
        preco: '0',
        observacoes: '',
        ncm: '',
        peso_liquido: '',
        peso_bruto: '',
        cest: '',
        beneficio_fiscal: '',
        ativo: 1
    });

    // NCMs mais comuns
    const ncmComuns = [
        { codigo: '84714900', descricao: 'Outros aparelhos de informática' },
        { codigo: '85176255', descricao: 'Aparelhos telefônicos' },
        { codigo: '85171231', descricao: 'Smartphones' },
        { codigo: '84713012', descricao: 'Computadores portáteis' },
        { codigo: '94036000', descricao: 'Móveis de madeira' },
        { codigo: '39269090', descricao: 'Outras obras de plástico' },
        { codigo: '73269090', descricao: 'Outras obras de ferro ou aço' },
        { codigo: '00000000', descricao: 'Serviços (sem NCM)' }
    ];

    // CESTs mais comuns
    const cestComuns = [
        { codigo: '0100100', descricao: 'Gasolina' },
        { codigo: '0100200', descricao: 'Óleo diesel' },
        { codigo: '0100300', descricao: 'Gás natural' },
        { codigo: '0200100', descricao: 'Água mineral' },
        { codigo: '0200200', descricao: 'Refrigerantes' },
        { codigo: '2100100', descricao: 'Medicamentos' }
    ];

    // Benefícios fiscais comuns
    const beneficiosFiscais = [
        'Substituição Tributária',
        'Redução de Base de Cálculo',
        'Isenção',
        'Diferimento',
        'Imunidade',
        'Suspensão'
    ];

    useEffect(() => {
        fetchData();
    }, []);

    // Calcular preço automaticamente quando custo ou margem mudarem
    useEffect(() => {
        if (formData.custo && formData.margem) {
            const custoNum = parseFloat(formData.custo) || 0;
            const margemNum = parseFloat(formData.margem) || 0;
            const precoCalculado = custoNum * (1 + (margemNum / 100));
            setFormData(prev => ({ ...prev, preco: precoCalculado.toFixed(2) }));
        }
    }, [formData.custo, formData.margem]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await produtosServicosAPI.listar();
            setProdutos(response.data || []);
        } catch (error) {
            showError('Erro ao carregar produtos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const showSuccess = (text) => {
        setMessage({ text, type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    const showError = (text) => {
        setMessage({ text, type: 'error' });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    const handleCreate = () => {
        setEditingProduto(null);
        setFormData({
            codigo: '',
            codigo_barras: '',
            finalidade: 'venda',
            nome: '',
            tipo: 'produto',
            tipo_unidade: 'UN',
            estoque_minimo: '0',
            estoque_atual: '0',
            custo: '0',
            margem: '0',
            preco: '0',
            observacoes: '',
            ncm: '',
            peso_liquido: '',
            peso_bruto: '',
            cest: '',
            beneficio_fiscal: '',
            ativo: 1
        });
        setAbaAtiva('basicas');
        setShowModal(true);
    };

    const handleEdit = (produto) => {
        setEditingProduto(produto);
        setFormData({
            codigo: produto.codigo || '',
            codigo_barras: produto.codigo_barras || '',
            finalidade: produto.finalidade || 'venda',
            nome: produto.nome || '',
            tipo: produto.tipo || 'produto',
            tipo_unidade: produto.tipo_unidade || 'UN',
            estoque_minimo: produto.estoque_minimo || '0',
            estoque_atual: produto.estoque_atual || '0',
            custo: produto.custo || '0',
            margem: produto.margem || '0',
            preco: produto.preco || '0',
            observacoes: produto.observacoes || '',
            ncm: produto.ncm || '',
            peso_liquido: produto.peso_liquido || '',
            peso_bruto: produto.peso_bruto || '',
            cest: produto.cest || '',
            beneficio_fiscal: produto.beneficio_fiscal || '',
            ativo: produto.ativo
        });
        setAbaAtiva('basicas');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingProduto(null);
        setAbaAtiva('basicas');
    };

    const gerarCodigoBarras = async () => {
        try {
            const response = await produtosServicosAPI.gerarCodigoBarras();
            setFormData({ ...formData, codigo_barras: response.data.codigo_barras });
            showSuccess('Código de barras gerado!');
        } catch (error) {
            showError('Erro ao gerar código de barras');
        }
    };

    const validateForm = () => {
        if (!formData.nome.trim()) {
            showError('Nome é obrigatório');
            return false;
        }

        if (!formData.tipo) {
            showError('Tipo é obrigatório');
            return false;
        }

        return true;
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            const dataToSave = {
                ...formData,
                nome: formData.nome.trim(),
                observacoes: formData.observacoes.trim(),
                estoque_minimo: parseFloat(formData.estoque_minimo) || 0,
                estoque_atual: parseFloat(formData.estoque_atual) || 0,
                custo: parseFloat(formData.custo) || 0,
                margem: parseFloat(formData.margem) || 0,
                preco: parseFloat(formData.preco) || 0,
                peso_liquido: formData.peso_liquido ? parseFloat(formData.peso_liquido) : null,
                peso_bruto: formData.peso_bruto ? parseFloat(formData.peso_bruto) : null
            };

            if (editingProduto) {
                await produtosServicosAPI.atualizar(editingProduto.id, dataToSave);
                showSuccess('Produto atualizado com sucesso');
            } else {
                await produtosServicosAPI.criar(dataToSave);
                showSuccess('Produto criado com sucesso');
            }

            handleCloseModal();
            await fetchData();
        } catch (error) {
            showError('Erro ao salvar produto: ' + error.message);
        }
    };

    const handleDelete = async (produto) => {
        if (!window.confirm(`Tem certeza que deseja excluir "${produto.nome}"?`)) {
            return;
        }

        try {
            await produtosServicosAPI.excluir(produto.id);
            showSuccess('Produto excluído com sucesso');
            fetchData();
        } catch (error) {
            showError('Erro ao excluir produto: ' + error.message);
        }
    };

    const formatarMoeda = (valor) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    };

    const produtosFiltrados = produtos.filter(p => {
        const termo = searchTerm.toLowerCase();
        return (
            p.nome.toLowerCase().includes(termo) ||
            p.codigo.toLowerCase().includes(termo) ||
            (p.codigo_barras && p.codigo_barras.toLowerCase().includes(termo))
        );
    });

    const produtosExibidos = produtosFiltrados.slice(0, recordsPerPage);

    if (loading) {
        return <div className="loading">Carregando produtos...</div>;
    }

    return (
        <div className="produtos-container">
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
            <div className="produtos-header">
                <div>
                    <h1>📦 Produtos e Serviços</h1>
                    <p className="header-subtitle">
                        Cadastre os produtos e tenha controle completo do seu estoque
                    </p>
                </div>
                <button className="btn-primary" onClick={handleCreate}>
                    ➕ Novo Produto/Serviço
                </button>
            </div>

            {/* Cards de Informação */}
            <div className="info-cards">
                <div className="info-card">
                    <div className="info-icon">📊</div>
                    <div className="info-content">
                        <h3>Saiba quanto você tem de estoque em tempo real</h3>
                    </div>
                </div>
                <div className="info-card">
                    <div className="info-icon">💰</div>
                    <div className="info-content">
                        <h3>Mantenha seus preços atualizados</h3>
                    </div>
                </div>
                <div className="info-card">
                    <div className="info-icon">📈</div>
                    <div className="info-content">
                        <h3>Saiba quais produtos você mais vende e quais geram mais lucro</h3>
                    </div>
                </div>
                <div className="info-card">
                    <div className="info-icon">🏷️</div>
                    <div className="info-content">
                        <h3>Gere etiquetas com código de barras dos seus produtos</h3>
                    </div>
                </div>
            </div>

            {/* Conteúdo principal */}
            <div className="produtos-content">
                {/* Filtros e Busca */}
                <div className="table-controls">
                    <div className="control-group">
                        <div className="records-per-page">
                            <label>Registros por página:</label>
                            <select
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
                            <label>🔍 Buscar:</label>
                            <input
                                type="text"
                                placeholder="Digite para buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabela */}
                <div className="table-responsive">
                    <table className="produtos-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Código de Barras</th>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th>Finalidade</th>
                                <th>Unidade</th>
                                <th>Estoque Atual</th>
                                <th>Estoque Mínimo</th>
                                <th>Custo</th>
                                <th>Margem</th>
                                <th>Preço</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {produtosExibidos.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="no-records-found">
                                        {searchTerm ? '🔍 Nenhum registro encontrado para a busca.' : '📋 Nenhum produto encontrado.'}
                                    </td>
                                </tr>
                            ) : (
                                produtosExibidos.map((produto) => (
                                    <tr key={produto.id} className={produto.estoque_baixo ? 'estoque-baixo' : ''}>
                                        <td>{produto.codigo}</td>
                                        <td>{produto.codigo_barras || '–'}</td>
                                        <td><strong>{produto.nome}</strong></td>
                                        <td>
                                            <span className={`badge badge-${produto.tipo}`}>
                                                {produto.tipo === 'produto' ? '📦 Produto' : '🔧 Serviço'}
                                            </span>
                                        </td>
                                        <td>{produto.finalidade === 'venda' ? 'Venda' : 
                                             produto.finalidade === 'uso_consumo' ? 'Uso/Consumo' : 'Matéria Prima'}</td>
                                        <td>{produto.tipo_unidade}</td>
                                        <td>
                                            {produto.tipo === 'produto' ? (
                                                <span className={produto.estoque_baixo ? 'estoque-alerta' : ''}>
                                                    {produto.estoque_atual}
                                                    {produto.estoque_baixo && ' ⚠️'}
                                                </span>
                                            ) : '–'}
                                        </td>
                                        <td>{produto.tipo === 'produto' ? produto.estoque_minimo : '–'}</td>
                                        <td>{formatarMoeda(produto.custo)}</td>
                                        <td>{produto.margem}%</td>
                                        <td><strong>{formatarMoeda(produto.preco)}</strong></td>
                                        <td>
                                            <span className={`status-badge ${produto.ativo ? 'ativo' : 'inativo'}`}>
                                                {produto.ativo ? '✅ Ativo' : '❌ Inativo'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button className="btn-edit" onClick={() => handleEdit(produto)}>
                                                ✏️ Editar
                                            </button>
                                            <button className="btn-delete" onClick={() => handleDelete(produto)}>
                                                🗑️ Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Info de registros */}
                <div className="table-info">
                    Mostrando {produtosExibidos.length} de {produtosFiltrados.length} registros
                    {searchTerm && ` (filtrados de ${produtos.length} total)`}
                </div>
            </div>

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {editingProduto ? '✏️ Editar Produto/Serviço' : '➕ Novo Produto/Serviço'}
                            </h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                ✕
                            </button>
                        </div>

                        {/* Abas */}
                        <div className="modal-tabs">
                            <button
                                className={`tab-button ${abaAtiva === 'basicas' ? 'active' : ''}`}
                                onClick={() => setAbaAtiva('basicas')}
                            >
                                📋 Informações Básicas
                            </button>
                            <button
                                className={`tab-button ${abaAtiva === 'nfe' ? 'active' : ''}`}
                                onClick={() => setAbaAtiva('nfe')}
                            >
                                📄 Informações para NF-e
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="modal-form">
                            {/* Aba: Informações Básicas */}
                            {abaAtiva === 'basicas' && (
                                <div className="form-sections">
                                    <div className="form-section">
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label>Código:</label>
                                                <input
                                                    type="text"
                                                    value={formData.codigo}
                                                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                                    placeholder="Será gerado automaticamente"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Código de Barras:</label>
                                                <div className="input-with-button">
                                                    <input
                                                        type="text"
                                                        value={formData.codigo_barras}
                                                        onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                                                        placeholder="Será gerado se vazio"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn-generate"
                                                        onClick={gerarCodigoBarras}
                                                    >
                                                        🔄 Gerar
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Finalidade: *</label>
                                                <select
                                                    value={formData.finalidade}
                                                    onChange={(e) => setFormData({ ...formData, finalidade: e.target.value })}
                                                    required
                                                >
                                                    <option value="venda">Venda</option>
                                                    <option value="uso_consumo">Uso/Consumo</option>
                                                    <option value="materia_prima">Matéria Prima</option>
                                                </select>
                                            </div>

                                            <div className="form-group form-group-full">
                                                <label>Nome do Produto/Serviço: *</label>
                                                <input
                                                    type="text"
                                                    value={formData.nome}
                                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                                    placeholder="Nome completo do produto ou serviço"
                                                    required
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Tipo: *</label>
                                                <select
                                                    value={formData.tipo}
                                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                                    required
                                                >
                                                    <option value="produto">Produto</option>
                                                    <option value="servico">Serviço</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label>Tipo Unidade: *</label>
                                                <select
                                                    value={formData.tipo_unidade}
                                                    onChange={(e) => setFormData({ ...formData, tipo_unidade: e.target.value })}
                                                    required
                                                >
                                                    <option value="UN">UN - Unidade</option>
                                                    <option value="PEÇA">PEÇA</option>
                                                    <option value="CAIXA">CAIXA</option>
                                                    <option value="KG">KG - Quilograma</option>
                                                    <option value="G">G - Grama</option>
                                                    <option value="L">L - Litro</option>
                                                    <option value="ML">ML - Mililitro</option>
                                                    <option value="M">M - Metro</option>
                                                    <option value="M2">M² - Metro Quadrado</option>
                                                    <option value="M3">M³ - Metro Cúbico</option>
                                                </select>
                                            </div>

                                            {formData.tipo === 'produto' && (
                                                <>
                                                    <div className="form-group">
                                                        <label>Estoque Mínimo:</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={formData.estoque_minimo}
                                                            onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <label>Estoque Atual:</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={formData.estoque_atual}
                                                            onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div className="form-group">
                                                <label>Custo (R$):</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.custo}
                                                    onChange={(e) => setFormData({ ...formData, custo: e.target.value })}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Margem (%):</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.margem}
                                                    onChange={(e) => setFormData({ ...formData, margem: e.target.value })}
                                                    placeholder="Porcentagem de lucro"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Preço (R$):</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.preco}
                                                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                                                    placeholder="Calculado automaticamente"
                                                />
                                                <small className="help-text">
                                                    Calculado: {formatarMoeda(formData.preco)}
                                                </small>
                                            </div>

                                            <div className="form-group">
                                                <label>Status:</label>
                                                <select
                                                    value={formData.ativo}
                                                    onChange={(e) => setFormData({ ...formData, ativo: parseInt(e.target.value) })}
                                                >
                                                    <option value={1}>✅ Ativo</option>
                                                    <option value={0}>❌ Inativo</option>
                                                </select>
                                            </div>

                                            <div className="form-group form-group-full">
                                                <label>Observações:</label>
                                                <textarea
                                                    value={formData.observacoes}
                                                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                                    placeholder="Observações adicionais sobre o produto/serviço"
                                                    rows="3"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Aba: Informações para NF-e */}
                            {abaAtiva === 'nfe' && (
                                <div className="form-sections">
                                    <div className="form-section">
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label>NCM:</label>
                                                <select
                                                    value={formData.ncm}
                                                    onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {ncmComuns.map(ncm => (
                                                        <option key={ncm.codigo} value={ncm.codigo}>
                                                            {ncm.codigo} - {ncm.descricao}
                                                        </option>
                                                    ))}
                                                </select>
                                                <small className="help-text">
                                                    Nomenclatura Comum do Mercosul
                                                </small>
                                            </div>

                                            <div className="form-group">
                                                <label>CEST:</label>
                                                <select
                                                    value={formData.cest}
                                                    onChange={(e) => setFormData({ ...formData, cest: e.target.value })}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {cestComuns.map(cest => (
                                                        <option key={cest.codigo} value={cest.codigo}>
                                                            {cest.codigo} - {cest.descricao}
                                                        </option>
                                                    ))}
                                                </select>
                                                <small className="help-text">
                                                    Código Especificador da Substituição Tributária
                                                </small>
                                            </div>

                                            <div className="form-group">
                                                <label>Peso Líquido (kg):</label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={formData.peso_liquido}
                                                    onChange={(e) => setFormData({ ...formData, peso_liquido: e.target.value })}
                                                    placeholder="0.000"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Peso Bruto (kg):</label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={formData.peso_bruto}
                                                    onChange={(e) => setFormData({ ...formData, peso_bruto: e.target.value })}
                                                    placeholder="0.000"
                                                />
                                            </div>

                                            <div className="form-group form-group-full">
                                                <label>Benefício Fiscal:</label>
                                                <select
                                                    value={formData.beneficio_fiscal}
                                                    onChange={(e) => setFormData({ ...formData, beneficio_fiscal: e.target.value })}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {beneficiosFiscais.map(beneficio => (
                                                        <option key={beneficio} value={beneficio}>
                                                            {beneficio}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                                    ❌ Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingProduto ? '💾 Atualizar' : '💾 Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProdutosServicos;

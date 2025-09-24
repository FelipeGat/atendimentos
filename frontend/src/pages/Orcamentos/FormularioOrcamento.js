import React, { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    Calendar,
    Calculator,
    FileText,
    Plus,
    Trash2,
    Upload,
    Image,
    Wrench,
    Package,
    Save,
    X,
    Edit
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './FormularioOrcamento.css';

const API_BASE = "http://localhost/Atendimentos/backend/api/orcamentos.php";

const FormularioOrcamentoExpandido = ({ orcamento, empresas, clientes, onSave, onCancel }) => {
    // Estados do formulário principal
    const [formData, setFormData] = useState({
        numero_orcamento: '',
        empresa_id: '',
        cliente_id: '',
        referencia: '',
        data_orcamento: new Date().toISOString().split('T')[0],
        validade_orcamento: '',
        prazo_inicio: '',
        prazo_duracao: '',
        observacoes: '',
        imposto_percentual: 0,
        frete: 0,
        desconto_valor: 0,
        desconto_percentual: 0,
        tipo_desconto: 'valor',
        condicoes_pagamento: '',
        meios_pagamento: '',
        anotacoes_internas: ''
    });

    // Estados para serviços
    const [servicos, setServicos] = useState([{
        id: Date.now(),
        servico: '',
        detalhes: '',
        preco_unitario: 0,
        quantidade: 1,
        desconto: 0,
        valor_total: 0
    }]);

    // Estados para materiais
    const [materiais, setMateriais] = useState([{
        id: Date.now(),
        material: '',
        detalhes: '',
        preco_unitario: 0,
        quantidade: 1,
        desconto: 0,
        valor_total: 0
    }]);

    // Estados para fotos
    const [fotos, setFotos] = useState([]);
    const [fotosPreview, setFotosPreview] = useState([]);

    // Estados de controle
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [errors, setErrors] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [initialFormState, setInitialFormState] = useState(null);

    // Calcular valores totais
    const calcularTotais = () => {
        const subtotalServicos = servicos.reduce((acc, servico) => acc + servico.valor_total, 0);
        const subtotalMateriais = materiais.reduce((acc, material) => acc + material.valor_total, 0);
        const subtotal = subtotalServicos + subtotalMateriais;

        const valorImposto = (subtotal * formData.imposto_percentual) / 100;
        const valorFrete = parseFloat(formData.frete) || 0;

        let valorDesconto = 0;
        if (formData.tipo_desconto === 'valor') {
            valorDesconto = parseFloat(formData.desconto_valor) || 0;
        } else {
            valorDesconto = (subtotal * parseFloat(formData.desconto_percentual)) / 100;
        }

        const valorTotal = subtotal + valorImposto + valorFrete - valorDesconto;

        return {
            subtotalServicos,
            subtotalMateriais,
            subtotal,
            valorImposto,
            valorFrete,
            valorDesconto,
            valorTotal: Math.max(0, valorTotal)
        };
    };

    // Inicializar dados se editando
    useEffect(() => {
        if (orcamento) {
            // DEBUG: Verificar dados recebidos
            console.log('=== DEBUG ORCAMENTO ===');
            console.log('Orçamento recebido:', orcamento);
            console.log('Servicos no orçamento:', orcamento?.servicos);
            console.log('Materiais no orçamento:', orcamento?.materiais);
            console.log('Tipo de servicos:', typeof orcamento?.servicos);
            console.log('É array servicos?', Array.isArray(orcamento?.servicos));
            console.log('Length servicos:', orcamento?.servicos?.length);

            const dadosIniciais = {
                ...formData,
                ...orcamento,
                data_orcamento: orcamento.data_orcamento?.split(' ')[0] || formData.data_orcamento,
                validade_orcamento: orcamento.validade_orcamento?.split(' ')[0] || '',
                prazo_inicio: orcamento.prazo_inicio?.split(' ')[0] || ''
            };
            setFormData(dadosIniciais);

            // CORREÇÃO: Carregar serviços do orçamento
            let servicosCarregados = [];

            if (orcamento.servicos && Array.isArray(orcamento.servicos) && orcamento.servicos.length > 0) {
                console.log('=== PROCESSANDO SERVICOS ===');
                servicosCarregados = orcamento.servicos.map(item => {
                    console.log('Item servico:', item);
                    const servicoProcessado = {
                        id: item.id || Date.now() + Math.random(),
                        servico: item.descricao || '',
                        detalhes: item.observacao || '',
                        preco_unitario: parseFloat(item.valor_unitario) || 0,
                        quantidade: parseFloat(item.quantidade) || 1,
                        desconto: 0, // Calcular desconto baseado na diferença
                        valor_total: parseFloat(item.valor_total) || 0
                    };
                    console.log('Servico processado:', servicoProcessado);
                    return servicoProcessado;
                });
            } else {
                console.log('=== SERVICOS NÃO ENCONTRADOS ===');
                console.log('Condições:', {
                    'orcamento.servicos existe': !!orcamento.servicos,
                    'é array': Array.isArray(orcamento.servicos),
                    'tem length > 0': orcamento.servicos?.length > 0
                });
            }

            // CORREÇÃO: Carregar materiais do orçamento
            let materiaisCarregados = [];

            if (orcamento.materiais && Array.isArray(orcamento.materiais) && orcamento.materiais.length > 0) {
                console.log('=== PROCESSANDO MATERIAIS ===');
                materiaisCarregados = orcamento.materiais.map(item => {
                    console.log('Item material:', item);
                    const materialProcessado = {
                        id: item.id || Date.now() + Math.random(),
                        material: item.descricao || '',
                        detalhes: item.observacao || '',
                        preco_unitario: parseFloat(item.valor_unitario) || 0,
                        quantidade: parseFloat(item.quantidade) || 1,
                        desconto: 0, // Calcular desconto baseado na diferença
                        valor_total: parseFloat(item.valor_total) || 0
                    };
                    console.log('Material processado:', materialProcessado);
                    return materialProcessado;
                });
            } else {
                console.log('=== MATERIAIS NÃO ENCONTRADOS ===');
                console.log('Condições:', {
                    'orcamento.materiais existe': !!orcamento.materiais,
                    'é array': Array.isArray(orcamento.materiais),
                    'tem length > 0': orcamento.materiais?.length > 0
                });
            }

            // DEBUG: Verificar dados processados
            console.log('=== DEBUG PROCESSAMENTO ===');
            console.log('Servicos carregados:', servicosCarregados);
            console.log('Materiais carregados:', materiaisCarregados);

            // Atualizar estados com os itens carregados
            setServicos(servicosCarregados);
            setMateriais(materiaisCarregados);

            console.log('=== DEBUG ESTADOS ATUALIZADOS ===');
            console.log('setServicos chamado com:', servicosCarregados);
            console.log('setMateriais chamado com:', materiaisCarregados);

            setInitialFormState(JSON.stringify({
                formData: dadosIniciais,
                servicos: servicosCarregados,
                materiais: materiaisCarregados,
                fotos: fotos.map(f => f.name)
            }));
        } else {
            console.log('=== NOVO ORCAMENTO ===');
            // Gerar número do orçamento
            const ano = new Date().getFullYear();
            const numeroAleatorio = Math.floor(Math.random() * 9000) + 1000;
            const dadosIniciais = {
                ...formData,
                numero_orcamento: `${ano}${numeroAleatorio}`,
                validade_orcamento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            setFormData(dadosIniciais);
            setInitialFormState(JSON.stringify({
                formData: dadosIniciais,
                servicos,
                materiais,
                fotos: []
            }));
        }
    }, [orcamento]);

    // Detectar mudanças no formulário
    useEffect(() => {
        if (initialFormState) {
            const currentState = JSON.stringify({
                formData,
                servicos,
                materiais,
                fotos: fotos.map(f => f.name)
            });
            setHasUnsavedChanges(currentState !== initialFormState);
        }
    }, [formData, servicos, materiais, fotos, initialFormState]);

    // Evento beforeunload para confirmar saída
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
                return 'Você tem alterações não salvas. Deseja realmente sair?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Calcular valor total de um item (serviço ou material)
    const calcularValorItem = (preco, quantidade, desconto) => {
        const subtotal = (parseFloat(preco) || 0) * (parseInt(quantidade) || 0);
        const valorDesconto = (parseFloat(desconto) || 0);
        return Math.max(0, subtotal - valorDesconto);
    };

    // Handlers para serviços
    const adicionarServico = () => {
        setServicos([...servicos, {
            id: Date.now(),
            servico: '',
            detalhes: '',
            preco_unitario: 0,
            quantidade: 1,
            desconto: 0,
            valor_total: 0
        }]);
    };

    const removerServico = (id) => {
        setServicos(servicos.filter(s => s.id !== id));
    };

    const atualizarServico = (id, campo, valor) => {
        setServicos(servicos.map(servico => {
            if (servico.id === id) {
                const novoServico = { ...servico, [campo]: valor };
                if (['preco_unitario', 'quantidade', 'desconto'].includes(campo)) {
                    novoServico.valor_total = calcularValorItem(
                        novoServico.preco_unitario,
                        novoServico.quantidade,
                        novoServico.desconto
                    );
                }
                return novoServico;
            }
            return servico;
        }));
    };

    // Handlers para materiais
    const adicionarMaterial = () => {
        setMateriais([...materiais, {
            id: Date.now(),
            material: '',
            detalhes: '',
            preco_unitario: 0,
            quantidade: 1,
            desconto: 0,
            valor_total: 0
        }]);
    };

    const removerMaterial = (id) => {
        setMateriais(materiais.filter(m => m.id !== id));
    };

    const atualizarMaterial = (id, campo, valor) => {
        setMateriais(materiais.map(material => {
            if (material.id === id) {
                const novoMaterial = { ...material, [campo]: valor };
                if (['preco_unitario', 'quantidade', 'desconto'].includes(campo)) {
                    novoMaterial.valor_total = calcularValorItem(
                        novoMaterial.preco_unitario,
                        novoMaterial.quantidade,
                        novoMaterial.desconto
                    );
                }
                return novoMaterial;
            }
            return material;
        }));
    };

    // Handler para fotos
    const handleFotosChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            const maxSize = 10 * 1024 * 1024; // 10MB
            return validTypes.includes(file.type) && file.size <= maxSize;
        });

        setFotos([...fotos, ...validFiles]);

        // Criar previews
        validFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setFotosPreview(prev => [...prev, {
                        id: Date.now() + Math.random(),
                        name: file.name,
                        url: e.target.result,
                        type: 'image'
                    }]);
                };
                reader.readAsDataURL(file);
            } else {
                setFotosPreview(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    url: null,
                    type: 'pdf'
                }]);
            }
        });
    };

    const removerFoto = (index) => {
        setFotos(fotos.filter((_, i) => i !== index));
        setFotosPreview(fotosPreview.filter((_, i) => i !== index));
    };

    // Validação
    const validarFormulario = () => {
        const novosErros = {};

        if (!formData.empresa_id) novosErros.empresa_id = 'Empresa é obrigatória';

        // CORREÇÃO: Melhor validação do cliente_id
        if (!formData.cliente_id || formData.cliente_id === "" || formData.cliente_id === "0") {
            novosErros.cliente_id = 'Cliente é obrigatório';
        } else if (isNaN(formData.cliente_id) || parseInt(formData.cliente_id) <= 0) {
            novosErros.cliente_id = 'Cliente selecionado é inválido';
        }

        if (!formData.data_orcamento) novosErros.data_orcamento = 'Data é obrigatória';
        if (!formData.validade_orcamento) novosErros.validade_orcamento = 'Validade é obrigatória';

        // Validar serviços
        servicos.forEach((servico, index) => {
            if (!servico.servico) novosErros[`servico_${index}`] = 'Nome do serviço é obrigatório';
            if (!servico.preco_unitario || servico.preco_unitario <= 0) {
                novosErros[`servico_preco_${index}`] = 'Preço unitário é obrigatório';
            }
            if (!servico.quantidade || servico.quantidade <= 0) {
                novosErros[`servico_quantidade_${index}`] = 'Quantidade é obrigatória';
            }
        });

        // Validar materiais
        materiais.forEach((material, index) => {
            if (!material.material) novosErros[`material_${index}`] = 'Nome do material é obrigatório';
            if (!material.preco_unitario || material.preco_unitario <= 0) {
                novosErros[`material_preco_${index}`] = 'Preço unitário é obrigatório';
            }
            if (!material.quantidade || material.quantidade <= 0) {
                novosErros[`material_quantidade_${index}`] = 'Quantidade é obrigatória';
            }
        });

        setErrors(novosErros);
        return Object.keys(novosErros).length === 0;
    };

    // Handler para cancelar com confirmação
    const handleCancel = () => {
        if (hasUnsavedChanges) {
            if (window.confirm('Você tem alterações não salvas. Deseja realmente sair sem salvar?')) {
                setHasUnsavedChanges(false);
                onCancel();
            }
        } else {
            onCancel();
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const dataToSend = {
            ...formData,
            servicos: servicos,
            materiais: materiais
        };

        const isNew = !orcamento || !orcamento.id;
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? API_BASE : `${API_BASE}?id=${orcamento.id}`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Empresa-ID': localStorage.getItem('empresa_id') || '1'
                },
                body: JSON.stringify(dataToSend)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Erro ao salvar orçamento');
            }

            toast.success(`Orçamento ${isNew ? 'criado' : 'atualizado'} com sucesso!`);
            onSave(result.data);
        } catch (error) {
            toast.error('Erro ao salvar orçamento: ' + error.message);
            console.error('Erro ao salvar orçamento:', error);
        } finally {
            setLoading(false);
        }
    }

    const totais = calcularTotais();

    return (
        <div className="formulario-orcamento">
            {hasUnsavedChanges && (
                <div className="unsaved-changes-indicator">
                    ⚠ Você tem alterações não salvas
                </div>
            )}

            {message.text && (
                <div className={`form-message ${message.type}`}>
                    {message.type === 'success' ? '✓' : '⚠'} {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="orcamento-form">
                <div className="form-sections-wrapper">
                    {/* Seção 1: Dados Principais */}
                    <div className="form-section">
                        <div className="section-header">
                            <Building2 size={20} />
                            <h3>Dados Principais</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>
                                    <FileText size={16} />
                                    Número do Orçamento *
                                </label>
                                <input
                                    type="text"
                                    value={formData.numero_orcamento}
                                    onChange={(e) => setFormData({ ...formData, numero_orcamento: e.target.value })}
                                    placeholder="Ex: 20254075"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    <Building2 size={16} />
                                    Empresa *
                                </label>
                                <select
                                    value={formData.empresa_id}
                                    onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                                    className={errors.empresa_id ? 'error' : ''}
                                    required
                                >
                                    <option value="">Selecione uma empresa</option>
                                    {empresas?.map(empresa => (
                                        <option key={empresa.id} value={empresa.id}>
                                            {empresa.nome}
                                        </option>
                                    ))}
                                </select>
                                {errors.empresa_id && <span className="error-message">{errors.empresa_id}</span>}
                            </div>

                            <div className="form-group">
                                <label>
                                    <Users size={16} />
                                    Cliente *
                                </label>
                                <select
                                    value={formData.cliente_id}
                                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                                    className={errors.cliente_id ? 'error' : ''}
                                    required
                                >
                                    <option value="">Selecione um cliente</option>
                                    {clientes?.map(cliente => (
                                        <option key={cliente.id} value={cliente.id}>
                                            {cliente.nome}
                                        </option>
                                    ))}
                                </select>
                                {errors.cliente_id && <span className="error-message">{errors.cliente_id}</span>}
                            </div>

                            <div className="form-group full-width">
                                <label>Referência</label>
                                <input
                                    type="text"
                                    value={formData.referencia}
                                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                                    placeholder="Ex: Projeto Sistema Web"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Datas e Prazos */}
                    <div className="form-section">
                        <div className="section-header">
                            <Calendar size={20} />
                            <h3>Datas e Prazos</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>
                                    <Calendar size={16} />
                                    Data do Orçamento *
                                </label>
                                <input
                                    type="date"
                                    value={formData.data_orcamento}
                                    onChange={(e) => setFormData({ ...formData, data_orcamento: e.target.value })}
                                    className={errors.data_orcamento ? 'error' : ''}
                                    required
                                />
                                {errors.data_orcamento && <span className="error-message">{errors.data_orcamento}</span>}
                            </div>

                            <div className="form-group">
                                <label>
                                    <Calendar size={16} />
                                    Validade *
                                </label>
                                <input
                                    type="date"
                                    value={formData.validade_orcamento}
                                    onChange={(e) => setFormData({ ...formData, validade_orcamento: e.target.value })}
                                    className={errors.validade_orcamento ? 'error' : ''}
                                    required
                                />
                                {errors.validade_orcamento && <span className="error-message">{errors.validade_orcamento}</span>}
                            </div>

                            <div className="form-group">
                                <label>Prazo de Início</label>
                                <input
                                    type="date"
                                    value={formData.prazo_inicio}
                                    onChange={(e) => setFormData({ ...formData, prazo_inicio: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input
                                    type="number"
                                    value={formData.prazo_duracao}
                                    onChange={(e) => setFormData({ ...formData, prazo_duracao: e.target.value })}
                                    placeholder="Ex: 30"
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seção 3: Serviços */}
                    <div className="form-section">
                        <div className="section-header">
                            <Wrench size={20} />
                            <h3>Serviços</h3>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={adicionarServico}
                                style={{ marginLeft: 'auto' }}
                            >
                                <Plus size={16} />
                                Adicionar Serviço
                            </button>
                        </div>

                        {servicos.map((servico, index) => (
                            <div key={servico.id} className="item-card">
                                <div className="item-header">
                                    <h4>Serviço #{index + 1}</h4>
                                    {servicos.length > 1 && (
                                        <button
                                            type="button"
                                            className="btn-remove"
                                            onClick={() => removerServico(servico.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Qual o Serviço? *</label>
                                        <input
                                            type="text"
                                            value={servico.servico}
                                            onChange={(e) => atualizarServico(servico.id, 'servico', e.target.value)}
                                            placeholder="Ex: Desenvolvimento de Sistema"
                                            className={errors[`servico_${index}`] ? 'error' : ''}
                                            required
                                        />
                                        {errors[`servico_${index}`] && <span className="error-message">{errors[`servico_${index}`]}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Preço Unitário *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={servico.preco_unitario}
                                            onChange={(e) => atualizarServico(servico.id, 'preco_unitario', e.target.value)}
                                            placeholder="0,00"
                                            className={errors[`servico_preco_${index}`] ? 'error' : ''}
                                            required
                                        />
                                        {errors[`servico_preco_${index}`] && <span className="error-message">{errors[`servico_preco_${index}`]}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Quantidade *</label>
                                        <input
                                            type="number"
                                            value={servico.quantidade}
                                            onChange={(e) => atualizarServico(servico.id, 'quantidade', e.target.value)}
                                            min="1"
                                            className={errors[`servico_quantidade_${index}`] ? 'error' : ''}
                                            required
                                        />
                                        {errors[`servico_quantidade_${index}`] && <span className="error-message">{errors[`servico_quantidade_${index}`]}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Desconto (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={servico.desconto}
                                            onChange={(e) => atualizarServico(servico.id, 'desconto', e.target.value)}
                                            placeholder="0,00"
                                            min="0"
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Detalhes do Serviço</label>
                                        <textarea
                                            value={servico.detalhes}
                                            onChange={(e) => atualizarServico(servico.id, 'detalhes', e.target.value)}
                                            placeholder="Descreva os detalhes do serviço..."
                                            rows="3"
                                        />
                                    </div>
                                </div>

                                <div className="item-total">
                                    <strong>Valor Total: R$ {servico.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Seção 4: Materiais */}
                    <div className="form-section">
                        <div className="section-header">
                            <Package size={20} />
                            <h3>Materiais</h3>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={adicionarMaterial}
                                style={{ marginLeft: 'auto' }}
                            >
                                <Plus size={16} />
                                Adicionar Material
                            </button>
                        </div>

                        {materiais.map((material, index) => (
                            <div key={material.id} className="item-card">
                                <div className="item-header">
                                    <h4>Material #{index + 1}</h4>
                                    {materiais.length > 1 && (
                                        <button
                                            type="button"
                                            className="btn-remove"
                                            onClick={() => removerMaterial(material.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Qual o Material? *</label>
                                        <input
                                            type="text"
                                            value={material.material}
                                            onChange={(e) => atualizarMaterial(material.id, 'material', e.target.value)}
                                            placeholder="Ex: Cabo de Rede Cat6"
                                            className={errors[`material_${index}`] ? 'error' : ''}
                                            required
                                        />
                                        {errors[`material_${index}`] && <span className="error-message">{errors[`material_${index}`]}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Preço Unitário *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={material.preco_unitario}
                                            onChange={(e) => atualizarMaterial(material.id, 'preco_unitario', e.target.value)}
                                            placeholder="0,00"
                                            className={errors[`material_preco_${index}`] ? 'error' : ''}
                                            required
                                        />
                                        {errors[`material_preco_${index}`] && <span className="error-message">{errors[`material_preco_${index}`]}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Quantidade *</label>
                                        <input
                                            type="number"
                                            value={material.quantidade}
                                            onChange={(e) => atualizarMaterial(material.id, 'quantidade', e.target.value)}
                                            min="1"
                                            className={errors[`material_quantidade_${index}`] ? 'error' : ''}
                                            required
                                        />
                                        {errors[`material_quantidade_${index}`] && <span className="error-message">{errors[`material_quantidade_${index}`]}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>Desconto (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={material.desconto}
                                            onChange={(e) => atualizarMaterial(material.id, 'desconto', e.target.value)}
                                            placeholder="0,00"
                                            min="0"
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Detalhes do Material</label>
                                        <textarea
                                            value={material.detalhes}
                                            onChange={(e) => atualizarMaterial(material.id, 'detalhes', e.target.value)}
                                            placeholder="Descreva os detalhes do material..."
                                            rows="3"
                                        />
                                    </div>
                                </div>

                                <div className="item-total">
                                    <strong>Valor Total: R$ {material.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Seção 5: Valores e Cálculos */}
                    <div className="form-section">
                        <div className="section-header">
                            <Calculator size={20} />
                            <h3>Valores e Cálculos</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Imposto (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.imposto_percentual}
                                    onChange={(e) => setFormData({ ...formData, imposto_percentual: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                    max="100"
                                />
                            </div>

                            <div className="form-group">
                                <label>Frete (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.frete}
                                    onChange={(e) => setFormData({ ...formData, frete: e.target.value })}
                                    placeholder="0,00"
                                    min="0"
                                />
                            </div>

                            <div className="form-group">
                                <label>Tipo de Desconto</label>
                                <select
                                    value={formData.tipo_desconto}
                                    onChange={(e) => setFormData({ ...formData, tipo_desconto: e.target.value })}
                                >
                                    <option value="valor">Valor (R$)</option>
                                    <option value="percentual">Percentual (%)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>
                                    Desconto ({formData.tipo_desconto === 'valor' ? 'R$' : '%'})
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.tipo_desconto === 'valor' ? formData.desconto_valor : formData.desconto_percentual}
                                    onChange={(e) => {
                                        if (formData.tipo_desconto === 'valor') {
                                            setFormData({ ...formData, desconto_valor: e.target.value });
                                        } else {
                                            setFormData({ ...formData, desconto_percentual: e.target.value });
                                        }
                                    }}
                                    placeholder="0"
                                    min="0"
                                    max={formData.tipo_desconto === 'percentual' ? '100' : undefined}
                                />
                            </div>
                        </div>

                        <div className="valores-resumo">
                            <div className="resumo-item">
                                <span>Subtotal Serviços:</span>
                                <span>R$ {totais.subtotalServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="resumo-item">
                                <span>Subtotal Materiais:</span>
                                <span>R$ {totais.subtotalMateriais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="resumo-item">
                                <span>Subtotal:</span>
                                <span>R$ {totais.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="resumo-item">
                                <span>Imposto ({formData.imposto_percentual}%):</span>
                                <span>R$ {totais.valorImposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="resumo-item">
                                <span>Frete:</span>
                                <span>R$ {totais.valorFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="resumo-item">
                                <span>Desconto:</span>
                                <span>- R$ {totais.valorDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="resumo-item total">
                                <span>VALOR TOTAL:</span>
                                <span>R$ {totais.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Seção 6: Fotos */}
                    <div className="form-section">
                        <div className="section-header">
                            <Image size={20} />
                            <h3>Fotos do Projeto</h3>
                        </div>

                        <div className="form-group">
                            <label>
                                <Upload size={16} />
                                Adicionar Fotos (JPG, PNG, PDF)
                            </label>
                            <input
                                type="file"
                                multiple
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={handleFotosChange}
                                className="file-input"
                            />
                            <p className="file-help">Máximo 10MB por arquivo. Formatos aceitos: JPG, PNG, PDF</p>
                        </div>

                        {fotosPreview.length > 0 && (
                            <div className="fotos-preview">
                                {fotosPreview.map((foto, index) => (
                                    <div key={foto.id} className="foto-item">
                                        {foto.type === 'image' ? (
                                            <img src={foto.url} alt={foto.name} className="foto-thumb" />
                                        ) : (
                                            <div className="pdf-thumb">
                                                <FileText size={32} />
                                            </div>
                                        )}
                                        <span className="foto-name">{foto.name}</span>
                                        <button
                                            type="button"
                                            className="btn-remove-foto"
                                            onClick={() => removerFoto(index)}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Seção 7: Observações */}
                    <div className="form-section">
                        <div className="section-header">
                            <FileText size={20} />
                            <h3>Observações</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Observações Gerais</label>
                                <textarea
                                    value={formData.observacoes}
                                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                    placeholder="Observações sobre o orçamento..."
                                    rows="3"
                                />
                            </div>

                            <div className="form-group">
                                <label>Condições de Pagamento</label>
                                <textarea
                                    value={formData.condicoes_pagamento}
                                    onChange={(e) => setFormData({ ...formData, condicoes_pagamento: e.target.value })}
                                    placeholder="Ex: 50% entrada, 50% na entrega"
                                    rows="2"
                                />
                            </div>

                            <div className="form-group">
                                <label>Meios de Pagamento</label>
                                <textarea
                                    value={formData.meios_pagamento}
                                    onChange={(e) => setFormData({ ...formData, meios_pagamento: e.target.value })}
                                    placeholder="Ex: PIX, Cartão, Boleto"
                                    rows="2"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Anotações Internas</label>
                                <textarea
                                    value={formData.anotacoes_internas}
                                    onChange={(e) => setFormData({ ...formData, anotacoes_internas: e.target.value })}
                                    placeholder="Anotações para uso interno..."
                                    rows="3"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        <X size={16} />
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="loading-spinner" />
                        ) : (
                            <Save size={16} />
                        )}
                        {loading ? 'Salvando...' : 'Salvar Orçamento'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FormularioOrcamentoExpandido;


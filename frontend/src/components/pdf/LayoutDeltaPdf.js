import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import logoImage from '../../assets/delta.png';

// --- ESTILOS ---
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 9,
        paddingTop: 5,
        paddingBottom: 80,
        paddingHorizontal: 40,
        color: '#333',
        backgroundColor: '#fff',
    },
    // ===================== CABEÇALHO =====================
    header: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 0,
        textAlign: 'center',
    },
    logo: {
        width: 90,
        height: 'auto',
        marginBottom: 0,
    },
    headerTextContainer: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#354F2A',
    },
    headerSlogan: {
        fontSize: 8,
        color: '#555',
        marginTop: 0,
    },
    headerSubtext: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#354F2A',
        marginTop: 0,
    },

    // TÍTULO DO ORÇAMENTO
    orcamentoTitleSection: {
        backgroundColor: '#354F2A',
        padding: 10,
        marginBottom: 15,
    },
    orcamentoTitleText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    orcamentoSubtitleText: {
        color: '#fff',
        fontSize: 9,
    },
    // SEÇÃO DO CLIENTE
    clienteSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    clienteInfo: {
        flex: 1.2,
    },
    clienteContato: {
        flex: 1,
        textAlign: 'left',
        paddingLeft: 20,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
    },
    icon: {
        width: 10,
        height: 10,
        marginRight: 5,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#354F2A',
        marginBottom: 8,
    },
    text: {
        fontSize: 9,
        lineHeight: 1.4,
    },
    // INFORMAÇÕES BÁSICAS
    infoBasicasSection: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        marginBottom: 15,
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoBlock: {
        width: '30%',
    },
    infoLabel: {
        fontWeight: 'bold',
        fontSize: 9,
    },
    // TABELAS (SERVIÇOS E MATERIAIS)
    table: {
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableRowTotal: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        fontWeight: 'bold',
    },
    colDesc: { width: '40%' },
    colUn: { width: '15%', textAlign: 'center' },
    colPrecoUnit: { width: '15%', textAlign: 'right' },
    colQtd: { width: '15%', textAlign: 'center' },
    colPreco: { width: '15%', textAlign: 'right' },

    // TOTAIS EXPANDIDOS
    totaisSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    totaisBox: {
        width: '55%',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        paddingHorizontal: 8,
    },
    totalRowSubtotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        marginTop: 5,
    },
    totalRowImposto: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        paddingHorizontal: 8,
        color: '#666',
    },
    totalRowFrete: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        paddingHorizontal: 8,
        color: '#666',
    },
    totalRowDesconto: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        paddingHorizontal: 8,
        color: '#d32f2f',
    },
    totalRowFinal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        paddingHorizontal: 8,
        backgroundColor: '#354F2A',
        color: '#fff',
        fontWeight: 'bold',
        marginTop: 5,
    },
    // PAGAMENTO E CONDIÇÕES
    pagamentoSection: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        marginBottom: 15,
    },
    pagamentoSectionPage2: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        marginBottom: 15,
        marginTop: 0,
    },
    // INFORMAÇÕES ADICIONAIS E ASSINATURAS
    assinaturasSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 80,
        textAlign: 'center',
    },
    assinaturaBox: {
        width: 220,
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingTop: 8,
    },
    // RODAPÉ
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 65,
        backgroundColor: '#F5F5F5',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingHorizontal: 40,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 8,
    },
    footerCol: {
        flexDirection: 'column',
    },
    pageNumber: {
        position: 'absolute',
        fontSize: 8,
        bottom: 15,
        left: 0,
        right: 40,
        textAlign: 'right',
        color: 'grey',
    },
});

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('pt-BR');
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('pt-BR');
};

// Função para calcular totais (replicada do formulário)
const calcularTotais = (orcamento) => {
    const subtotalServicos = orcamento.servicos?.reduce((acc, servico) => acc + (Number(servico.valor_total) || 0), 0) || 0;
    const subtotalMateriais = orcamento.materiais?.reduce((acc, material) => acc + (Number(material.valor_total) || 0), 0) || 0;
    const subtotal = subtotalServicos + subtotalMateriais;

    const valorImposto = (subtotal * (Number(orcamento.imposto_percentual) || 0)) / 100;
    const valorFrete = Number(orcamento.frete) || 0;

    let valorDesconto = 0;
    if (orcamento.tipo_desconto === 'valor') {
        valorDesconto = Number(orcamento.desconto_valor) || 0;
    } else {
        valorDesconto = (subtotal * (Number(orcamento.desconto_percentual) || 0)) / 100;
    }

    const valorTotal = subtotal + valorImposto + valorFrete - valorDesconto;

    return {
        subtotalServicos,
        subtotalMateriais,
        subtotal,
        valorImposto,
        valorFrete,
        valorDesconto,
        valorTotal: Math.max(0, valorTotal),
        temImposto: (Number(orcamento.imposto_percentual) || 0) > 0,
        temFrete: (Number(orcamento.frete) || 0) > 0,
        temDesconto: valorDesconto > 0
    };
};

// --- COMPONENTES REUTILIZÁVEIS ---

// Rodapé que aparece apenas na última página
const Footer = ({ empresa, emailIconUrl, phoneIconUrl }) => (
    <View style={styles.footer} fixed>
        <View style={styles.footerCol}>
            <Text style={{ fontWeight: 'bold' }}>{empresa?.nome || 'F&W Manutenções e Serviços'}</Text>
            <Text>CNPJ: {empresa?.cnpj || '54.119.781/0001-67'}</Text>
            <Text>{empresa?.endereco || 'Rua Ceciliano Abel de Almeida, 25'}</Text>
            <Text>{empresa?.cidade || 'Residencial Jacaraípe, Serra-ES'}</Text>
            <Text>CEP: {empresa?.cep || '29175-444'}</Text>
        </View>
        <View style={[styles.footerCol, { alignItems: 'flex-end' }]}>
            <View style={styles.contactRow}>
                <Image style={styles.icon} src={emailIconUrl} />
                <Text>comercial.delta2024@gmail.com</Text>
            </View>
            <View style={styles.contactRow}>
                <Image style={styles.icon} src={phoneIconUrl} />
                <Text>+55 (27) 4042-4157 / 3109-0108</Text>
            </View>
            <View style={styles.contactRow}>
                <Image style={styles.icon} src={phoneIconUrl} />
                <Text>+55 (27) 4042-4157</Text>
            </View>
        </View>
    </View>
);

// --- COMPONENTE PRINCIPAL ---
const LayoutDeltaPdf = ({ orcamento, empresa, cliente }) => {

    const totais = calcularTotais(orcamento);
    const logoUrl = logoImage;

    const emailIconUrl = 'https://cdn-icons-png.flaticon.com/512/732/732200.png';
    const phoneIconUrl = 'https://cdn-icons-png.flaticon.com/512/724/724664.png';

    return (
        <Document title={`Orçamento ${orcamento.numero_orcamento}`}>
            <Page size="A4" style={styles.page}>

                {/* --- CABEÇALHO CORRIGIDO --- */}
                <View style={styles.header}>
                    <Image style={styles.logo} src={logoUrl} />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerSubtext}>SOLUÇÕES PARA SUA CASA E EMPRESA</Text>
                    </View>
                </View>

                {/* --- TÍTULO DO ORÇAMENTO --- */}
                <View style={styles.orcamentoTitleSection}>
                    <Text style={styles.orcamentoTitleText}>Orçamento {orcamento.numero_orcamento}</Text>
                    <Text style={styles.orcamentoSubtitleText}>{orcamento.referencia || 'Catracas Eletronicas'}</Text>
                </View>

                {/* --- DADOS DO CLIENTE --- */}
                <View style={styles.clienteSection}>
                    <View style={styles.clienteInfo}>
                        <Text style={styles.sectionTitle}>Cliente: {cliente?.nome_fantasia || cliente?.nome}</Text>
                        <Text>{cliente?.razao_social}</Text>
                        <Text>CNPJ: {cliente?.cnpj}</Text>
                        <Text>{cliente?.endereco}, {cliente?.numero}</Text>
                        <Text>{cliente?.bairro}, {cliente?.cidade}-{cliente?.estado}</Text>
                        <Text>CEP: {cliente?.cep}</Text>
                    </View>
                    <View style={styles.clienteContato}>
                        <View style={styles.contactRow}>
                            <Image style={styles.icon} src={emailIconUrl} />
                            <Text>{cliente?.email}</Text>
                        </View>
                        <View style={styles.contactRow}>
                            <Image style={styles.icon} src={phoneIconUrl} />
                            <Text>{cliente?.telefone}</Text>
                        </View>
                    </View>
                </View>

                {/* --- INFORMAÇÕES BÁSICAS --- */}
                <View style={styles.table}>
                    <Text style={styles.sectionTitle}>Informações básicas</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Validade do orçamento</Text>
                            <Text>{orcamento.validade_orcamento ? `${Math.ceil((new Date(orcamento.validade_orcamento) - new Date(orcamento.data_orcamento)) / (1000 * 60 * 60 * 24))} dias` : '10 dias'}</Text>
                        </View>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Prazo de execução</Text>
                            <Text>{orcamento.prazo_duracao ? `${orcamento.prazo_duracao} dias úteis` : '15 dias úteis'}</Text>
                        </View>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Duração do serviço</Text>
                            <Text>{orcamento.prazo_duracao ? `${orcamento.prazo_duracao} dias úteis` : '5 dias úteis'}</Text>
                        </View>
                    </View>
                </View>

                {/* --- TABELA DE SERVIÇOS --- */}
                {orcamento.servicos && orcamento.servicos.length > 0 && (
                    <View style={styles.table}>
                        <Text style={styles.sectionTitle}>Serviços</Text>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.colDesc, { fontWeight: 'bold' }]}>Descrição</Text>
                            <Text style={[styles.colUn, { fontWeight: 'bold' }]}>Unidade</Text>
                            <Text style={[styles.colPrecoUnit, { fontWeight: 'bold' }]}>Preço unitário</Text>
                            <Text style={[styles.colQtd, { fontWeight: 'bold' }]}>Qtd.</Text>
                            <Text style={[styles.colPreco, { fontWeight: 'bold' }]}>Preço</Text>
                        </View>
                        {orcamento.servicos.map((item, index) => (
                            <View key={`serv-${index}`} style={styles.tableRow}>
                                <Text style={styles.colDesc}>{item.descricao}</Text>
                                <Text style={styles.colUn}>un.</Text>
                                <Text style={styles.colPrecoUnit}>{formatCurrency(item.valor_unitario || (item.valor_total / item.quantidade))}</Text>
                                <Text style={styles.colQtd}>{item.quantidade}</Text>
                                <Text style={styles.colPreco}>{formatCurrency(item.valor_total)}</Text>
                            </View>
                        ))}
                        {/* --- LINHA DE VALOR TOTAL DOS SERVIÇOS --- */}
                        <View style={styles.tableRowTotal}>
                            <Text style={styles.colDesc}>Valor Total</Text>
                            <Text style={styles.colUn}>un.</Text>
                            <Text style={styles.colPrecoUnit}>{formatCurrency(totais.subtotalServicos)}</Text>
                            <Text style={styles.colQtd}>1</Text>
                            <Text style={styles.colPreco}>{formatCurrency(totais.subtotalServicos)}</Text>
                        </View>
                    </View>
                )}

                {/* --- TABELA DE MATERIAIS --- */}
                {orcamento.materiais && orcamento.materiais.length > 0 && (
                    <View style={styles.table} wrap={false}>
                        <Text style={styles.sectionTitle}>Materiais</Text>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.colDesc, { fontWeight: 'bold' }]}>Descrição</Text>
                            <Text style={[styles.colUn, { fontWeight: 'bold' }]}>Unidade</Text>
                            <Text style={[styles.colPrecoUnit, { fontWeight: 'bold' }]}>Preço unitário</Text>
                            <Text style={[styles.colQtd, { fontWeight: 'bold' }]}>Qtd.</Text>
                            <Text style={[styles.colPreco, { fontWeight: 'bold' }]}>Preço</Text>
                        </View>
                        {orcamento.materiais.map((item, index) => (
                            <View key={`mat-${index}`} style={styles.tableRow}>
                                <Text style={styles.colDesc}>{item.descricao}</Text>
                                <Text style={styles.colUn}>un.</Text>
                                <Text style={styles.colPrecoUnit}>{formatCurrency(item.valor_unitario || (item.valor_total / item.quantidade))}</Text>
                                <Text style={styles.colQtd}>{item.quantidade}</Text>
                                <Text style={styles.colPreco}>{formatCurrency(item.valor_total)}</Text>
                            </View>
                        ))}
                        {/* --- LINHA DE VALOR TOTAL DOS MATERIAIS --- */}
                        <View style={styles.tableRowTotal}>
                            <Text style={styles.colDesc}>Valor Total</Text>
                            <Text style={styles.colUn}>un.</Text>
                            <Text style={styles.colPrecoUnit}>{formatCurrency(totais.subtotalMateriais)}</Text>
                            <Text style={styles.colQtd}>1</Text>
                            <Text style={styles.colPreco}>{formatCurrency(totais.subtotalMateriais)}</Text>
                        </View>
                    </View>
                )}

                {/* --- TOTAIS EXPANDIDOS COM CÁLCULOS DETALHADOS --- */}
                <View style={styles.totaisSection}>
                    <View style={styles.totaisBox}>
                        <View style={styles.totalRow}>
                            <Text>Serviços</Text>
                            <Text>{formatCurrency(totais.subtotalServicos)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text>Materiais</Text>
                            <Text>{formatCurrency(totais.subtotalMateriais)}</Text>
                        </View>
                        <View style={styles.totalRowSubtotal}>
                            <Text style={{ fontWeight: 'bold' }}>Subtotal</Text>
                            <Text style={{ fontWeight: 'bold' }}>{formatCurrency(totais.subtotal)}</Text>
                        </View>

                        {/* Mostrar imposto apenas se aplicado */}
                        {totais.temImposto && (
                            <View style={styles.totalRowImposto}>
                                <Text>Imposto ({orcamento.imposto_percentual}%)</Text>
                                <Text>+ {formatCurrency(totais.valorImposto)}</Text>
                            </View>
                        )}

                        {/* Mostrar frete apenas se aplicado */}
                        {totais.temFrete && (
                            <View style={styles.totalRowFrete}>
                                <Text>Frete</Text>
                                <Text>+ {formatCurrency(totais.valorFrete)}</Text>
                            </View>
                        )}

                        {/* Mostrar desconto apenas se aplicado */}
                        {totais.temDesconto && (
                            <View style={styles.totalRowDesconto}>
                                <Text>
                                    Desconto {orcamento.tipo_desconto === 'percentual' ? `(${orcamento.desconto_percentual}%)` : ''}
                                </Text>
                                <Text>- {formatCurrency(totais.valorDesconto)}</Text>
                            </View>
                        )}

                        <View style={styles.totalRowFinal}>
                            <Text>Total</Text>
                            <Text>{formatCurrency(totais.valorTotal)}</Text>
                        </View>
                    </View>
                </View>

                {/* --- PAGAMENTO (Página 1) --- */}
                <View style={styles.table} wrap={false}>
                    <Text style={styles.sectionTitle}>Pagamento</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Meios de pagamento</Text>
                            <Text>{orcamento.meios_pagamento || 'Transferência bancária, dinheiro ou pix.'}</Text>
                        </View>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>PIX</Text>
                            <Text>{empresa?.cnpj || '54.119.781/0001-67'}</Text>
                        </View>
                    </View>
                </View>

                {/* --- NÚMERO DA PÁGINA --- */}
                <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                    `Página ${pageNumber}/${totalPages}`
                )} fixed />


                {/* --- DADOS BANCÁRIOS E CONDIÇÕES (ESPAÇAMENTO CORRIGIDO) --- */}
                <View style={styles.table}>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Dados bancários</Text>
                            <Text>Banco: Sicoob</Text>
                            <Text>Agência: 3008</Text>
                            <Text>Conta: 251.876-7</Text>
                            <Text>Tipo de conta: Corrente</Text>
                            <Text>Titular da conta (CPF/CNPJ): {empresa?.cnpj || '54.119.781/0001-67'}</Text>
                        </View>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Condições de pagamento</Text>
                            <Text>{orcamento.condicoes_pagamento || 'À vista.'}</Text>
                        </View>
                    </View>
                </View>

                {/* --- INFORMAÇÕES ADICIONAIS --- */}
                <View style={{ marginTop: 20 }}>
                    <Text style={styles.sectionTitle}>Informações adicionais</Text>
                    <Text>Valores em Reais;</Text>
                    <Text>Garantia de 90 dias. Garantia não cobre defeitos elétricos ou manutenções dadas por outros técnicos.</Text>
                    <Text>Prazo para Início é de 5 dias úteis a contar da data de Pagamento da entrada.</Text>
                    <Text>Orçamento conforme Visita/Conversa Prévia. Caso necessário a inclusão de materiais ou mão de obra não orçada será cobrado ao final do serviço.</Text>

                    {/* Incluir observações do orçamento se existirem */}
                    {orcamento.observacoes && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.infoLabel}>Observações:</Text>
                            <Text>{orcamento.observacoes}</Text>
                        </View>
                    )}
                </View>

                {/* --- DATA --- */}
                <View style={{ textAlign: 'right', marginTop: 40, marginBottom: 40 }}>
                    <Text>Serra, {formatDate(orcamento.data_orcamento)}</Text>
                </View>

                {/* --- ASSINATURAS --- */}
                <View style={styles.assinaturasSection}>
                    <View style={styles.assinaturaBox}>
                        <Text>Delta Soluções</Text>
                        <Text>Diretor Comercial</Text>
                    </View>
                    <View style={styles.assinaturaBox}>
                        <Text>{cliente?.nome_fantasia || cliente?.nome}</Text>
                        <Text>CNPJ: {cliente?.cnpj}</Text>
                    </View>
                </View>

                {/* --- RODAPÉ (Apenas na última página) --- */}
                <Footer empresa={empresa} emailIconUrl={emailIconUrl} phoneIconUrl={phoneIconUrl} />

            </Page>
        </Document>
    );
};

export default LayoutDeltaPdf;

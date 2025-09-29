import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// --- FONTES ---
// Se você tiver os arquivos de fonte, pode registrá-los para maior fidelidade.
// Font.register({
//   family: 'Roboto',
//   fonts: [
//     { src: '/path/to/Roboto-Regular.ttf' },
//     { src: '/path/to/Roboto-Bold.ttf', fontWeight: 'bold' },
//   ],
// });

// --- ESTILOS ---
const styles = StyleSheet.create({
    // GERAL
    page: {
        fontFamily: 'Helvetica', // Use 'Roboto' se registrar a fonte
        fontSize: 9,
        paddingTop: 35,
        paddingBottom: 80, // Espaço para o rodapé fixo
        paddingHorizontal: 40,
        color: '#333',
        backgroundColor: '#fff',
    },
    // CABEÇALHO
    header: {
        textAlign: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 80,
        height: 'auto',
        alignSelf: 'center',
        marginBottom: 5,
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
    },
    // TÍTULO DO ORÇAMENTO
    orcamentoTitleSection: {
        backgroundColor: '#354F2A', // Verde escuro
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
        flex: 1,
    },
    clienteContato: {
        flex: 1,
        textAlign: 'right',
        fontSize: 9,
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
    colDesc: { width: '55%' },
    colUn: { width: '15%', textAlign: 'center' },
    colQtd: { width: '15%', textAlign: 'center' },
    colPreco: { width: '15%', textAlign: 'right' },
    // TOTAIS
    totaisSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    totaisBox: {
        width: '45%',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        paddingHorizontal: 8,
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
    // PAGAMENTO
    pagamentoSection: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        marginBottom: 15,
    },
    pagamentoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    pagamentoBlock: {
        width: '48%',
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
        bottom: 70, // Posição logo acima do rodapé
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
    if (!dateString) return '-';
    const date = new Date(dateString);
    // Adiciona o fuso para evitar problemas de data
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('pt-BR');
};

// --- COMPONENTE PRINCIPAL ---
const LayoutDeltaPdf = ({ orcamento, empresa, cliente }) => {
    // Calcula totais
    const subtotalServicos = orcamento.servicos?.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0) || 0;
    const subtotalMateriais = orcamento.materiais?.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0) || 0;
    const valorTotal = Number(orcamento.valor_total) || 0;

    return (
        <Document title={`Orçamento ${orcamento.numero_orcamento}`}>
            <Page size="A4" style={styles.page}>
                {/* --- CABEÇALHO --- */}
                <View style={styles.header}>
                    {/* Use uma URL pública ou converta a imagem para base64 */}
                    <Image style={styles.logo} src="/logo-delta.png" />
                    <Text style={styles.headerTitle}>Delta Soluções</Text>
                </View>

                {/* --- TÍTULO DO ORÇAMENTO --- */}
                <View style={styles.orcamentoTitleSection}>
                    <Text style={styles.orcamentoTitleText}>Orçamento {orcamento.numero_orcamento}</Text>
                    <Text style={styles.orcamentoSubtitleText}>{orcamento.referencia || 'Serviços Gerais'}</Text>
                </View>

                {/* --- DADOS DO CLIENTE --- */}
                <View style={styles.clienteSection}>
                    <View style={styles.clienteInfo}>
                        <Text style={styles.sectionTitle}>Cliente: {cliente?.nome_fantasia || cliente?.nome}</Text>
                        <Text>{cliente?.razao_social}</Text>
                        <Text>{cliente?.endereco}, {cliente?.numero}</Text>
                        <Text>{cliente?.bairro}, {cliente?.cidade}-{cliente?.estado}</Text>
                        <Text>CEP: {cliente?.cep}</Text>
                    </View>
                    <View style={styles.clienteContato}>
                        <Text>{cliente?.email}</Text>
                    </View>
                </View>

                {/* --- INFORMAÇÕES BÁSICAS --- */}
                <View style={styles.infoBasicasSection}>
                    <Text style={styles.sectionTitle}>Informações básicas</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Validade do orçamento</Text>
                            <Text>{orcamento.validade_orcamento ? `${Math.ceil((new Date(orcamento.validade_orcamento) - new Date(orcamento.data_orcamento)) / (1000 * 60 * 60 * 24))} dias` : '-'}</Text>
                        </View>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Prazo de execução</Text>
                            <Text>{orcamento.prazo_duracao ? `${orcamento.prazo_duracao} dias úteis` : '-'}</Text>
                        </View>
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Duração do serviço</Text>
                            <Text>{orcamento.prazo_duracao ? `${orcamento.prazo_duracao} dias úteis` : '-'}</Text>
                        </View>
                    </View>
                    {orcamento.observacoes && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.infoLabel}>Observações</Text>
                            <Text>{orcamento.observacoes}</Text>
                        </View>
                    )}
                </View>

                {/* --- TABELA DE SERVIÇOS --- */}
                {orcamento.servicos && orcamento.servicos.length > 0 && (
                    <View style={styles.table}>
                        <Text style={styles.sectionTitle}>Serviços</Text>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.colDesc, { fontWeight: 'bold' }]}>Descrição</Text>
                            <Text style={[styles.colUn, { fontWeight: 'bold' }]}>Unidade</Text>
                            <Text style={[styles.colQtd, { fontWeight: 'bold' }]}>Qtd.</Text>
                            <Text style={[styles.colPreco, { fontWeight: 'bold' }]}>Preço</Text>
                        </View>
                        {orcamento.servicos.map((item, index) => (
                            <View key={`serv-${index}`} style={styles.tableRow}>
                                <Text style={styles.colDesc}>{item.descricao}</Text>
                                <Text style={styles.colUn}>un.</Text>
                                <Text style={styles.colQtd}>{item.quantidade}</Text>
                                <Text style={styles.colPreco}>{formatCurrency(item.valor_total)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* --- TABELA DE MATERIAIS --- */}
                {orcamento.materiais && orcamento.materiais.length > 0 && (
                    <View style={styles.table}>
                        <Text style={styles.sectionTitle}>Materiais</Text>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.colDesc, { fontWeight: 'bold' }]}>Descrição</Text>
                            <Text style={[styles.colUn, { fontWeight: 'bold' }]}>Unidade</Text>
                            <Text style={[styles.colQtd, { fontWeight: 'bold' }]}>Qtd.</Text>
                            <Text style={[styles.colPreco, { fontWeight: 'bold' }]}>Preço</Text>
                        </View>
                        {orcamento.materiais.map((item, index) => (
                            <View key={`mat-${index}`} style={styles.tableRow}>
                                <Text style={styles.colDesc}>{item.descricao}</Text>
                                <Text style={styles.colUn}>un.</Text>
                                <Text style={styles.colQtd}>{item.quantidade}</Text>
                                <Text style={styles.colPreco}>{formatCurrency(item.valor_total)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* --- TOTAIS --- */}
                <View style={styles.totaisSection}>
                    <View style={styles.totaisBox}>
                        <View style={styles.totalRow}>
                            <Text>Serviços</Text>
                            <Text>{formatCurrency(subtotalServicos)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text>Materiais</Text>
                            <Text>{formatCurrency(subtotalMateriais)}</Text>
                        </View>
                        <View style={styles.totalRowFinal}>
                            <Text>Total</Text>
                            <Text>{formatCurrency(valorTotal)}</Text>
                        </View>
                    </View>
                </View>

                {/* --- PAGAMENTO --- */}
                <View style={styles.pagamentoSection} wrap={false}>
                    <Text style={styles.sectionTitle}>Pagamento</Text>
                    <View style={styles.pagamentoGrid}>
                        <View style={styles.pagamentoBlock}>
                            <Text style={styles.infoLabel}>Meios de pagamento</Text>
                            <Text>{orcamento.meios_pagamento || 'Transferência bancária, dinheiro ou pix.'}</Text>
                        </View>
                        <View style={styles.pagamentoBlock}>
                            <Text style={styles.infoLabel}>PIX</Text>
                            <Text>{empresa?.cnpj || '54.119.781/0001-67'}</Text>
                        </View>
                    </View>
                    <View style={{ marginTop: 10 }}>
                        <Text style={styles.infoLabel}>Dados bancários</Text>
                        <Text>Banco: Sicoob | Agência: 3008 | Conta: 251.876-7</Text>
                        <Text>Tipo de conta: Corrente</Text>
                        <Text>Titular da conta (CNPJ): {empresa?.cnpj || '54.119.781/0001-67'}</Text>
                    </View>
                </View>

                {/* --- INFORMAÇÕES ADICIONAIS (Pode quebrar a página) --- */}
                <View style={{ marginTop: 20 }} break>
                    <Text style={styles.sectionTitle}>Informações adicionais</Text>
                    <Text>Valores em Reais;</Text>
                    <Text>Garantia de 90 dias. Garantia não cobre defeitos elétricos ou manutenções dadas por outros técnicos.</Text>
                    <Text>Prazo para Início é de 5 dias úteis a contar da data de Pagamento da entrada.</Text>
                    <Text>Orçamento conforme Visita/Conversa Prévia. Caso necessário a inclusão de materiais ou mão de obra não orçada será cobrado ao final do serviço.</Text>
                </View>

                {/* --- ASSINATURAS --- */}
                <View style={styles.assinaturasSection}>
                    <View style={styles.assinaturaBox}>
                        <Text>Delta Soluções</Text>
                        <Text>Diretor Comercial</Text>
                    </View>
                    <View style={styles.assinaturaBox}>
                        <Text>{cliente?.nome_fantasia || cliente?.nome}</Text>
                    </View>
                </View>

                {/* --- NÚMERO DA PÁGINA --- */}
                <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                    `Página ${pageNumber} / ${totalPages}`
                )} fixed />

                {/* --- RODAPÉ FIXO --- */}
                <View style={styles.footer} fixed>
                    <View style={styles.footerCol}>
                        <Text style={{ fontWeight: 'bold' }}>{empresa?.nome || 'F&W Manutenções e Serviços'}</Text>
                        <Text>CNPJ: {empresa?.cnpj || '54.119.781/0001-67'}</Text>
                        <Text>{empresa?.endereco || 'Rua Ceciliano Abel de Almeida, 25'}</Text>
                        <Text>{empresa?.cidade || 'Residencial Jacaraípe, Serra-ES'}</Text>
                        <Text>CEP: {empresa?.cep || '29175-444'}</Text>
                    </View>
                    <View style={[styles.footerCol, { alignItems: 'flex-end' }]}>
                        <Text>comercial.delta2024@gmail.com</Text>
                        <Text>+55 (27) 99884-5397</Text>
                        <Text>+55 (27) 99745-8265</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

export default LayoutDeltaPdf;

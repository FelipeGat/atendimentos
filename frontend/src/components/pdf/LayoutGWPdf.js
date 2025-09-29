import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Definição dos estilos (CSS-in-JS)
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        padding: 30,
        color: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottom: '1px solid #eee',
        paddingBottom: 10,
    },
    empresaInfo: {
        flexDirection: 'column',
    },
    empresaContatos: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    logo: {
        width: 100,
        height: 'auto',
        marginBottom: 5,
    },
    tituloSection: {
        backgroundColor: '#f2f2f2',
        padding: 8,
        textAlign: 'center',
        marginBottom: 15,
    },
    tituloText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    infoSection: {
        backgroundColor: '#f2f2f2',
        padding: 10,
        marginBottom: 20,
        borderRadius: 5,
    },
    infoText: {
        marginBottom: 4,
    },
    tabelaHeader: {
        flexDirection: 'row',
        backgroundColor: '#333',
        color: 'white',
        padding: 5,
        fontWeight: 'bold',
    },
    tabelaRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #eee',
        padding: 5,
    },
    colDescricao: { width: '50%' },
    colQtd: { width: '15%', textAlign: 'center' },
    colUnitario: { width: '15%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },
    totaisSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    totalBox: {
        border: '1px solid #ccc',
        padding: 10,
        width: 200,
    },
    totalLabel: {
        fontWeight: 'bold',
    },
    assinaturas: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 60,
    },
    assinaturaBox: {
        width: 200,
        textAlign: 'center',
        borderTop: '1px solid #333',
        paddingTop: 5,
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: 'grey',
    },
});

const LayoutGWPdf = ({ orcamento }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Cabeçalho */}
            <View style={styles.header}>
                <View style={styles.empresaInfo}>
                    {/* Substitua pelo caminho do seu logo */}
                    <Image style={styles.logo} src="/path/to/gw-logo.png" />
                    <Text>GW SOLUCOES LTDA</Text>
                    <Text>CNPJ: 54.153.847/0001-35</Text>
                    <Text>Avenida Belo Horizonte, 21</Text>
                    <Text>Marcílio de Noronha, Viana-ES - CEP 29135-470</Text>
                </View>
                <View style={styles.empresaContatos}>
                    <Text>Data: {new Date(orcamento.data_orcamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</Text>
                    <Text>wallaslovatti@yahoo.com.br</Text>
                    <Text>+55 (27) 99745-8265</Text>
                </View>
            </View>

            {/* Título */}
            <View style={styles.tituloSection}>
                <Text style={styles.tituloText}>Orçamento {orcamento.numero_orcamento}</Text>
            </View>

            {/* Dados do Cliente */}
            <View style={styles.infoSection}>
                <Text style={styles.infoText}>Cliente: {orcamento.cliente_nome}</Text>
                {/* Adicionar mais dados do cliente se necessário */}
            </View>

            {/* Tabela de Itens */}
            <View>
                <View style={styles.tabelaHeader}>
                    <Text style={styles.colDescricao}>Descrição</Text>
                    <Text style={styles.colQtd}>Qtd.</Text>
                    <Text style={styles.colUnitario}>Vlr. Unit.</Text>
                    <Text style={styles.colTotal}>Vlr. Total</Text>
                </View>
                {/* Serviços */}
                {orcamento.servicos?.map(item => (
                    <View key={item.id} style={styles.tabelaRow}>
                        <Text style={styles.colDescricao}>{item.descricao}</Text>
                        <Text style={styles.colQtd}>{item.quantidade}</Text>
                        <Text style={styles.colUnitario}>{item.valor_unitario.toFixed(2)}</Text>
                        <Text style={styles.colTotal}>{item.valor_total.toFixed(2)}</Text>
                    </View>
                ))}
                {/* Materiais */}
                {orcamento.materiais?.map(item => (
                    <View key={item.id} style={styles.tabelaRow}>
                        <Text style={styles.colDescricao}>{item.descricao}</Text>
                        <Text style={styles.colQtd}>{item.quantidade}</Text>
                        <Text style={styles.colUnitario}>{item.valor_unitario.toFixed(2)}</Text>
                        <Text style={styles.colTotal}>{item.valor_total.toFixed(2)}</Text>
                    </View>
                ))}
            </View>

            {/* Totais */}
            <View style={styles.totaisSection}>
                <View style={styles.totalBox}>
                    <Text>Subtotal: R$ {(orcamento.servicos.reduce((a, b) => a + b.valor_total, 0) + orcamento.materiais.reduce((a, b) => a + b.valor_total, 0)).toFixed(2)}</Text>
                    <Text>Desconto: R$ {orcamento.desconto_valor.toFixed(2)}</Text>
                    <Text style={styles.totalLabel}>Total: R$ {orcamento.valor_total.toFixed(2)}</Text>
                </View>
            </View>

            {/* Informações Adicionais */}
            <View style={{ marginTop: 20 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Informações Adicionais:</Text>
                <Text>{orcamento.observacoes || 'Execução de serviços por profissionais qualificados e treinados.'}</Text>
            </View>

            {/* Assinaturas */}
            <View style={styles.assinaturas}>
                <View style={styles.assinaturaBox}>
                    <Text>GW Soluções</Text>
                    <Text>Wallas Lovatti</Text>
                </View>
                <View style={styles.assinaturaBox}>
                    <Text>{orcamento.cliente_nome}</Text>
                </View>
            </View>

            {/* Rodapé */}
            <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                `Página ${pageNumber} / ${totalPages}`
            )} fixed />
        </Page>
    </Document>
);

export default LayoutGWPdf;

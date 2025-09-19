/**
 * Hook para controles de tabela (busca, ordenação, paginação)
 * Sistema de Gerenciamento de Atendimentos
 */

import { useState, useCallback, useMemo } from 'react';

export const useTableControls = (data = [], initialRecordsPerPage = 10) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState(initialRecordsPerPage);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Função para filtrar dados
    const filterData = useCallback((items, term) => {
        if (!term) return items;
        
        return items.filter(item => {
            return Object.values(item).some(value => {
                if (value === null || value === undefined) return false;
                return value.toString().toLowerCase().includes(term.toLowerCase());
            });
        });
    }, []);

    // Função para ordenar dados
    const sortData = useCallback((items, config) => {
        if (!config.key) return items;

        return [...items].sort((a, b) => {
            let aValue = a[config.key];
            let bValue = b[config.key];

            // Tratar valores nulos
            if (aValue === null || aValue === undefined) aValue = '';
            if (bValue === null || bValue === undefined) bValue = '';

            // Detectar se é data
            if (config.key.includes('_em') || config.key.includes('data_')) {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }

            // Detectar se é número
            if (config.key === 'id' || config.key.includes('valor') || config.key.includes('tempo')) {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            }

            if (aValue < bValue) {
                return config.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return config.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, []);

    // Dados processados (filtrados e ordenados)
    const processedData = useMemo(() => {
        let filtered = filterData(data, searchTerm);
        let sorted = sortData(filtered, sortConfig);
        return sorted;
    }, [data, searchTerm, sortConfig, filterData, sortData]);

    // Dados para exibição (com paginação)
    const displayedData = useMemo(() => {
        return processedData.slice(0, recordsPerPage);
    }, [processedData, recordsPerPage]);

    // Função para alterar ordenação
    const handleSort = useCallback((key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }, [sortConfig]);

    // Função para obter ícone de ordenação
    const getSortIcon = useCallback((columnKey) => {
        if (sortConfig.key !== columnKey) {
            return '↕️';
        }
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    }, [sortConfig]);

    return {
        searchTerm,
        setSearchTerm,
        recordsPerPage,
        setRecordsPerPage,
        sortConfig,
        processedData,
        displayedData,
        handleSort,
        getSortIcon,
        totalRecords: data.length,
        filteredRecords: processedData.length,
        displayedRecords: displayedData.length
    };
};


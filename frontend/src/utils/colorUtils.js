// Função para extrair a cor predominante de uma imagem
export const getPredomiantColor = async (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;

        // Analisar cores de forma mais inteligente
        const colorCandidates = [];

        // Dividir a imagem em 9 regiões (3x3) para análise
        const regionWidth = canvas.width / 3;
        const regionHeight = canvas.height / 3;

        for (let regionY = 0; regionY < 3; regionY++) {
          for (let regionX = 0; regionX < 3; regionX++) {
            const regionColors = new Map();

            // Analisar cada região
            const startX = Math.floor(regionX * regionWidth);
            const endX = Math.floor((regionX + 1) * regionWidth);
            const startY = Math.floor(regionY * regionHeight);
            const endY = Math.floor((regionY + 1) * regionHeight);

            for (let y = startY; y < endY; y++) {
              for (let x = startX; x < endX; x++) {
                const i = (y * canvas.width + x) * 4;

                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const a = imageData[i + 3];

                if (a < 200) continue;

                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                if (brightness > 230 || brightness < 30) continue;

                // Calcular saturação
                const maxChannel = Math.max(r, g, b);
                const minChannel = Math.min(r, g, b);
                const saturation =
                  maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;

                if (saturation < 0.5) continue; // Muito restritivo

                const colorKey = `${Math.floor(r / 20) * 20}-${
                  Math.floor(g / 20) * 20
                }-${Math.floor(b / 20) * 20}`;

                if (!regionColors.has(colorKey)) {
                  regionColors.set(colorKey, {
                    r: Math.floor(r / 20) * 20,
                    g: Math.floor(g / 20) * 20,
                    b: Math.floor(b / 20) * 20,
                    count: 0,
                    saturation: saturation,
                    brightness: brightness,
                  });
                }
                regionColors.get(colorKey).count++;
              }
            }

            // Pegar a cor mais significativa desta região
            if (regionColors.size > 0) {
              let bestRegionColor = null;
              let bestRegionScore = 0;

              regionColors.forEach((color) => {
                const score = color.count * color.saturation;
                if (score > bestRegionScore) {
                  bestRegionScore = score;
                  bestRegionColor = color;
                }
              });

              if (bestRegionColor) {
                // Dar mais peso para região central (1,1)
                const regionWeight = regionX === 1 && regionY === 1 ? 2.0 : 1.0;
                bestRegionColor.regionWeight = regionWeight;
                bestRegionColor.regionScore = bestRegionScore * regionWeight;
                colorCandidates.push(bestRegionColor);
              }
            }
          }
        }

        if (colorCandidates.length === 0) {
          resolve("#000000");
          return;
        }

        // Encontrar a melhor cor entre os candidatos
        let bestColor = null;
        let bestScore = 0;

        colorCandidates.forEach((color) => {
          // Score neutro baseado apenas na saturação e frequência na região
          const totalScore = color.regionScore * color.saturation;

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestColor = color;
          }
        });

        if (!bestColor) {
          resolve("#000000");
          return;
        }

        const hex = `#${(
          (1 << 24) +
          (bestColor.r << 16) +
          (bestColor.g << 8) +
          bestColor.b
        )
          .toString(16)
          .slice(1)}`;
        resolve(hex);
      } catch (error) {
        console.error("Erro ao processar imagem:", error);
        resolve("#000000");
      }
    };

    img.onerror = () => {
      console.error("Erro ao carregar imagem");
      resolve("#000000");
    };

    img.src = imageUrl;
  });
};

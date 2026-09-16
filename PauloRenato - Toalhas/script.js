let products = []; // populado via loadProductsFromBackend()

// ==========================================
// CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ==========================================
let mySwiperInstance = null;
let cart = [];
let currentProductInModal = null;
let imagensSelecionadas = []; // Armazena fotos ilimitadas para o carrossel do novo produto

// Inicialização única e segura do sistema ao carregar a página
document.addEventListener("DOMContentLoaded", function() {
    loadProductsFromBackend();
    
    const sizeSelect = document.getElementById('m-size');
    const colorSelect = document.getElementById('m-color');
    
    if (sizeSelect) sizeSelect.addEventListener('change', () => updatePrice('size'));
    if (colorSelect) colorSelect.addEventListener('change', () => updatePrice('color'));
});

// ==========================================
// CARREGAMENTO DINÂMICO DO BANCO DE DADOS
// ==========================================
// ==========================================
// CARREGAMENTO E SINCRONIZAÇÃO AUTOMÁTICA
// ==========================================
async function fetchProdutos() {
    const response = await fetch("https://backend-paulo-renato.onrender.com/api/toalhas", { cache: "no-store" });
    if (!response.ok) throw new Error("Resposta " + response.status);
    return response.json();
}

async function loadProductsFromBackend(tentativa = 1) {
    const grid = document.getElementById('catalog-grid');

    try {
        products = await fetchProdutos();
        renderGrid();
    } catch (error) {
        // O backend gratuito pode "dormir" e demorar pra acordar na primeira chamada.
        // Tenta de novo uma vez antes de mostrar erro pro cliente.
        if (tentativa === 1) {
            console.warn("Falha ao carregar produtos, tentando novamente em 4s...", error);
            setTimeout(() => loadProductsFromBackend(2), 4000);
            return;
        }

        console.error("Não foi possível carregar o catálogo:", error);
        if (grid) {
            grid.innerHTML = '<p style="text-align:center; padding: 40px;">Não foi possível carregar o catálogo agora. Por favor, atualize a página em alguns instantes.</p>';
        }
    }
}

// ==========================================
// RENDERIZAÇÃO DA VITRINE (GRADE DE PRODUTOS)
// ==========================================
// 1. ATUALIZAÇÃO DA RENDERIZAÇÃO DA VITRINE COM BOTÕES DE MOVER
function renderGrid() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return; 
    grid.innerHTML = ''; 

    const isAdmin = localStorage.getItem('paulorenato_admin_logged') === 'true';

    products.forEach((p, idx) => {
        let precosHTML = "";
        if (p.variations && p.variations.length > 0) {
            precosHTML = `<div class="price-container-grid">`;
            p.variations.forEach((v, index) => {
                const precoNum = parseFloat(v.price) || 0;
                precosHTML += `
                    <div class="price-block" onclick="${isAdmin ? `event.stopPropagation(); editGridPrice(${p.id})` : ''}" style="${isAdmin ? 'cursor: pointer;' : ''}">
                        <span class="price-label">${v.size}</span>
                        <span class="price-value">R$ ${precoNum.toFixed(2).replace('.', ',')}${isAdmin ? ' ✏️' : ''}</span>
                    </div>
                    ${index === 0 ? '<span class="price-divider">|</span>' : ''}
                `;
            });
            precosHTML += `</div>`;
        }

        const imagemCapa = (p.images && p.images.length > 0) ? p.images[0] : "https://via.placeholder.com/320";

        // Cria os botões de controle do Admin incluindo setas de ordenação
        grid.innerHTML += `
            <div class="product-card" style="position:relative;">
                <div class="admin-controls">
                    <button class="admin-btn admin-move-btn" onclick="event.stopPropagation(); moveProduct(${idx}, 'up')" title="Mover para Cima">🔼</button>
                    <button class="admin-btn admin-move-btn" onclick="event.stopPropagation(); moveProduct(${idx}, 'down')" title="Mover para Baixo">🔽</button>
                    <button class="admin-btn admin-delete" onclick="event.stopPropagation(); deleteProductIntegrated(${p.id})" title="Excluir Produto">🗑️</button>
                </div>
                <div onclick="openModal(${p.id})">
                    <img src="${imagemCapa}" alt="${p.name}" loading="lazy">
                    <h3>${p.name}</h3>
                    ${precosHTML}
                </div>
            </div>
        `;
    });
    
    checkAdminSession();
}

// 2. NOVA FUNÇÃO: MOVER PRODUTO DE POSIÇÃO NA TELA E SALVAR NO BANCO
async function moveProduct(currentIndex, direction) {
    let targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Valida as pontas da lista
    if (targetIndex < 0 || targetIndex >= products.length) return;

    // Troca de posição no array local
    const temp = products[currentIndex];
    products[currentIndex] = products[targetIndex];
    products[targetIndex] = temp;

    // Monta o payload mapeando a nova ordem sequencial (0, 1, 2...)
    const listaOrdem = products.map((prod, index) => ({
        id: prod.id,
        ordem: index
    }));

    // Envia a nova ordem direto para a API reordenar no MySQL
    try {
        const response = await fetch("https://backend-paulo-renato.onrender.com/api/toalhas/reordenar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listaOrdem })
        });

        if (response.ok) {
            renderGrid(); // Redesenha a tela instantaneamente com a nova ordem!
        }
    } catch (error) {
        console.error("Erro ao reordenar produtos:", error);
    }
}


// CORREÇÃO: Garante que roda o render da galeria assim que as fotos são lidas
function handleMultipleImages(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Reseta o array para não acumular lixo de seleções antigas erradas
    imagensSelecionadas = []; 
    
    let carregadas = 0;
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagensSelecionadas.push(e.target.result);
            carregadas++;
            
            // Quando terminar de ler a ÚLTIMA foto selecionada, desenha na tela com o X
            if (carregadas === files.length) {
                renderPreviewGaleria();
            }
        };
        reader.readAsDataURL(file);
    });
}

// CORREÇÃO: Garante a criação correta dos wrappers com o botão X vermelho
function renderPreviewGaleria() {
    const previewContainer = document.getElementById('preview-galeria');
    if (!previewContainer) return;
    previewContainer.innerHTML = ''; // Limpa o preview anterior

    imagensSelecionadas.forEach((imgBase64, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-image-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.margin = '5px';

        wrapper.innerHTML = `
            <img src="${imgBase64}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
            <div class="remove-photo-badge" onclick="removePhotoFromPreview(${index})" style="position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">X</div>
        `;
        previewContainer.appendChild(wrapper);
    });
}

// Remove a foto do array e atualiza os "X" na tela
function removePhotoFromPreview(index) {
    imagensSelecionadas.splice(index, 1);
    renderPreviewGaleria();
}

// CORREÇÃO: Mover produtos atualizando o banco e a tela na hora
// FUNÇÃO DE MOVER CORRIGIDA
async function moveProduct(currentIndex, direction) {
    let targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Evita que o primeiro suba ou o último desça
    if (targetIndex < 0 || targetIndex >= products.length) return;

    // Inverte a posição deles no array local da tela
    const temp = products[currentIndex];
    products[currentIndex] = products[targetIndex];
    products[targetIndex] = temp;

    // Monta a lista mapeando a nova ordem sequencial com IDs limpos
    const listaOrdem = products.map((prod, index) => ({
        id: Number(prod.id),
        ordem: index
    }));

    try {
        const response = await fetch("https://backend-paulo-renato.onrender.com/api/toalhas/reordenar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listaOrdem })
        });

        if (response.ok) {
            // Atualiza a vitrine visualmente na hora
            renderGrid(); 
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error("Resposta de erro do servidor:", errorData);
            alert("Erro ao salvar a nova ordem no servidor. Verifique o console do Node.");
        }
    } catch (error) {
        console.error("Erro na requisição de reordenação:", error);
        alert("Não foi possível conectar ao servidor backend.");
    }
}

// ==========================================
// LÓGICA DO MODAL DE COMPRA / DETALHES
// ==========================================
function openModal(id) {
    const p = products.find(prod => Number(prod.id) === Number(id));
    if (!p) return;

    currentProductInModal = p;
    const isAdmin = localStorage.getItem('paulorenato_admin_logged') === 'true';

    // Injeta os textos aplicando indicador visual de edição (✏️) caso seja administrador
    document.getElementById('m-title').innerHTML = p.name + (isAdmin ? ' ✏️' : '');
    document.getElementById('m-desc').innerHTML = (p.desc || p.descricao || "Produto exclusivo PAULO RENATO REPRESENTAÇÕES.") + (isAdmin ? ' ✏️' : '');
    
    // Ativa a edição em tempo real ao clicar nos textos (Estilo Figma)
    if (isAdmin) {
        document.getElementById('m-title').onclick = () => editField(p, 'name');
        document.getElementById('m-desc').onclick = () => editField(p, 'desc');
        document.getElementById('m-title').style.cursor = 'pointer';
        document.getElementById('m-desc').style.cursor = 'pointer';
    } else {
        document.getElementById('m-title').onclick = null;
        document.getElementById('m-desc').onclick = null;
    }
    
    const selectSize = document.getElementById('m-size');
    if (selectSize) {
        selectSize.innerHTML = '';
        if (p.variations && p.variations.length > 0) {
            p.variations.forEach((v) => {
                const option = document.createElement('option');
                option.value = v.size; 
                option.innerText = v.size;
                option.setAttribute('data-price', v.price);

                const imgIndex = p.images ? p.images.indexOf(v.image) : -1; 
                option.setAttribute('data-img-index', imgIndex !== -1 ? imgIndex : 0);
                selectSize.appendChild(option);
            });
        } 
    }

    const containerColor = document.getElementById('container-color');
    const selectColor = document.getElementById('m-color');
    if (containerColor && selectColor) {
        selectColor.innerHTML = '';
        if (p.availableTypes && p.availableTypes.length > 0) {
            containerColor.style.display = "block";
            p.availableTypes.forEach((t) => {
                const option = document.createElement('option');
                option.value = t.color;
                option.innerText = t.color;
                const imgIndex = p.images ? p.images.indexOf(t.image) : -1;
                option.setAttribute('data-img-index', imgIndex !== -1 ? imgIndex : 0);
                selectColor.appendChild(option);
            });
        } else {
            containerColor.style.display = "none";
        }
    }

    const whatsappNum = p.whatsappNumber || "5583999629222";
    const waText = encodeURIComponent(`Olá, tenho interesse no produto: ${p.name}`);
    const directWa = document.getElementById('direct-wa');
    if (directWa) directWa.href = `https://wa.me/${whatsappNum}?text=${waText}`;

    // Alimenta o Carrossel do Swiper com todas as fotos salvas do banco de dados
    const wrapper = document.getElementById('carousel-wrapper');
    if (wrapper) {
        wrapper.innerHTML = ''; 
        if (p.images && Array.isArray(p.images)) {
            wrapper.innerHTML = p.images.map(imgUrl => `
                <div class="swiper-slide">
                    <img src="${imgUrl}" alt="${p.name}" style="width:100%; display:block;">
                </div>
            `).join('');
        }
    }

    document.getElementById('product-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';

    if (mySwiperInstance) mySwiperInstance.destroy(true, true);
    mySwiperInstance = new Swiper(".mySwiper", {
        navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
        pagination: { el: ".swiper-pagination", clickable: true },
        observer: true, observeParents: true
    });

    updatePrice('size'); 
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function updatePrice(origem) {
    const selectSize = document.getElementById('m-size');
    const colorSelect = document.getElementById('m-color');
    const priceDisplay = document.getElementById('m-price');
    const inputQty = document.getElementById('m-qty');
    const msgAtacado = document.getElementById('msg-atacado');
    
    if (!selectSize || selectSize.selectedIndex === -1) return;

    const selectedOption = selectSize.options[selectSize.selectedIndex];
    const nomeVariacao = selectedOption.value.toUpperCase();

    if (selectedOption) {
        const newPrice = parseFloat(selectedOption.getAttribute('data-price'));
        if (!isNaN(newPrice) && newPrice > 0) {
            priceDisplay.innerText = `R$ ${newPrice.toFixed(2).replace('.', ',')}`;
        } else {
            priceDisplay.innerText = "Preço a consultar";
        }

        if (nomeVariacao === "ATACADO") {
            if (inputQty) {
                inputQty.disabled = true;
                inputQty.style.opacity = "0.5";
                inputQty.value = 1;
            }
            if (msgAtacado) msgAtacado.style.display = "block";
        } else {
            if (inputQty) {
                inputQty.disabled = false;
                inputQty.style.opacity = "1";
            }
            if (msgAtacado) msgAtacado.style.display = "none";
        }
    }

    let imgIndex = null;
    if (origem === 'color' && colorSelect && colorSelect.selectedIndex !== -1) {
        const selectedColorOption = colorSelect.options[colorSelect.selectedIndex];
        imgIndex = selectedColorOption.getAttribute('data-img-index');
    } else {
        imgIndex = selectedOption.getAttribute('data-img-index');
    }

    if (mySwiperInstance && imgIndex !== null && imgIndex !== -1) {
        mySwiperInstance.slideTo(parseInt(imgIndex, 10), 500);
    }
}

// ==========================================
// FUNÇÕES DE GERENCIAMENTO (MODO ADMIN)
// ==========================================

// Abre o painel avançado limpo
function openAdvancedNewProductModal() {
    document.getElementById('advancedProductModal').style.display = 'flex';
    imagensSelecionadas = []; // Reseta o array de uploads ilimitados
    document.getElementById('advName').value = '';
    document.getElementById('advDesc').value = '';
    document.getElementById('advVarejo').value = '';
    document.getElementById('advAtacado').value = '';
    document.getElementById('preview-galeria').innerHTML = '';
    document.getElementById('advFiles').value = '';
}

function closeAdvancedModal() {
    document.getElementById('advancedProductModal').style.display = 'none';
}

// Processa fotos ilimitadas simultâneas vindas da galeria do aparelho
function handleMultipleImages(event) {
    const files = Array.from(event.target.files);
    const previewContainer = document.getElementById('preview-galeria');
    previewContainer.innerHTML = ''; 
    imagensSelecionadas = []; 

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagensSelecionadas.push(e.target.result); // Adiciona a string Base64 da foto
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '60px';
            img.style.height = '60px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

// Salva e publica o produto contendo fotos ilimitadas e descrição customizada
// Salva e publica o produto contendo fotos ilimitadas e descrição customizada
async function saveAdvancedProduct() {
    const nome = document.getElementById('advName').value.trim();
    const descricaoBreve = document.getElementById('advDesc').value.trim();
    
    // CORREÇÃO: Previne o erro de vírgula ao cadastrar novos produtos
    const inputVarejo = document.getElementById('advVarejo').value;
    const inputAtacado = document.getElementById('advAtacado').value;
    const varejo = parseFloat(inputVarejo.replace(',', '.')) || 0;
    const atacado = parseFloat(inputAtacado.replace(',', '.')) || 0;

    if (!nome) return alert("Digite o nome do produto.");
    if (imagensSelecionadas.length === 0) return alert("Selecione pelo menos 1 foto para o produto.");

    const novoProduto = {
        name: nome,
        desc: descricaoBreve || "Produto exclusivo PAULO RENATO REPRESENTAÇÕES.",
        images: imagensSelecionadas,
        availableTypes: [],
        variations: [
            { size: "Varejo", price: varejo },
            { size: "Atacado", price: atacado }
        ]
    };

    try {
        const response = await fetch("https://backend-paulo-renato.onrender.com/api/toalhas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novoProduto)
        });

        if (response.ok) {
            alert("Produto adicionado com sucesso ao catálogo!");
            closeAdvancedModal();
            location.reload(); 
        } else {
            alert("Erro ao salvar produto. Verifique se as fotos não são pesadas demais.");
        }
    } catch (error) {
        alert("Erro de comunicação com o servidor backend.");
    }
}

// Salva alterações de Nome ou Descrição feitas direto nos textos clicáveis do modal
async function editField(product, field) {
    let newValue;
    if (field === 'name') newValue = prompt("Altere o nome do produto:", product.name);
    if (field === 'desc') newValue = prompt("Altere a descrição do produto:", (product.desc || product.descricao));

    if (newValue === null || newValue.trim() === "") return;

    product[field] = newValue.trim();

    const response = await fetch("https://backend-paulo-renato.onrender.com/api/toalhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
    });

    if (response.ok) {
        alert("Informação atualizada!");
        location.reload();
    }
}

// Edita os valores com um clique em cima do preço correspondente (Varejo ou Atacado)
// ==========================================
// MODAL CUSTOMIZADO DE EDIÇÃO DE PREÇOS
// ==========================================
let currentEditProductId = null; // Guarda qual produto estamos editando

// 1. Abre a janelinha preenchendo com os preços atuais
// 1. Abre a janelinha preenchendo com os preços atuais de forma segura


// 2. Fecha a janelinha
function closePriceModal() {
    document.getElementById('custom-price-modal').style.display = 'none';
    currentEditProductId = null;
}

// 1. Abre a janelinha preenchendo com os preços atuais de forma segura
function editGridPrice(productId) {
    const p = products.find(prod => Number(prod.id) === Number(productId));
    if (!p) return;

    currentEditProductId = productId;

    // Obtém com segurança as variações sem travar se alguma não existir
    const varejoObj = (p.variations && p.variations[0]) ? p.variations[0] : { price: 0 };
    const atacadoObj = (p.variations && p.variations[1]) ? p.variations[1] : { price: 0 };

    const priceVarejo = Number(varejoObj.price) || 0;
    const priceAtacado = Number(atacadoObj.price) || 0;

    document.getElementById('edit-varejo-input').value = priceVarejo.toFixed(2).replace('.', ',');
    document.getElementById('edit-atacado-input').value = priceAtacado.toFixed(2).replace('.', ',');

    document.getElementById('custom-price-modal').style.display = 'flex';
}

// 2. Fecha a janelinha
function closePriceModal() {
    document.getElementById('custom-price-modal').style.display = 'none';
    currentEditProductId = null;
}

// 3. Salva os novos preços no Banco de Dados com segurança
async function saveCustomPrice() {
    if (currentEditProductId === null) return;

    const p = products.find(prod => Number(prod.id) === Number(currentEditProductId));
    if (!p) return;

    const inputVarejo = document.getElementById('edit-varejo-input').value;
    const inputAtacado = document.getElementById('edit-atacado-input').value;

    // Normaliza a estrutura de variações se estiver incompleta
    if (!Array.isArray(p.variations)) p.variations = [];
    if (!p.variations[0]) p.variations[0] = { size: "Varejo", price: 0 };
    if (!p.variations[1]) p.variations[1] = { size: "Atacado", price: 0 };

    p.variations[0].price = parseFloat(inputVarejo.replace(',', '.')) || 0;
    p.variations[1].price = parseFloat(inputAtacado.replace(',', '.')) || 0;

    const btnSave = document.getElementById('save-price-btn');
    btnSave.innerText = "Salvando...";
    btnSave.disabled = true;

    try {
        const response = await fetch("https://backend-paulo-renato.onrender.com/api/toalhas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p)
        });

        if (response.ok) {
            renderGrid();
            closePriceModal();
        } else {
            alert("Erro ao salvar no banco de dados.");
        }
    } catch (error) {
        alert("Erro de conexão ao tentar salvar o preço.");
    } finally {
        btnSave.innerText = "Salvar Preços";
        btnSave.disabled = false;
    }
}

// Remove o produto permanentemente do banco através do botão de lixeira no card
async function deleteProductIntegrated(productId) {
    if (!confirm("Remover este produto permanentemente do catálogo?")) return;
    const response = await fetch(`https://backend-paulo-renato.onrender.com/api/toalhas/${productId}`, { method: "DELETE" });
    if (response.ok) {
        alert("Produto removido com sucesso.");
        location.reload();
    }
}

// Validação visual e ativação dos controles do Administrador logado
function checkAdminSession() {
    if (localStorage.getItem('paulorenato_admin_logged') === 'true') {
        document.body.classList.add('admin-active');
        const floatingBar = document.getElementById('admin-floating-bar');
        if (floatingBar) floatingBar.style.display = 'flex';
    }
}

function logoutAdmin() {
    localStorage.removeItem('paulorenato_admin_logged');
    location.reload();
}

// ==========================================
// LÓGICA DO CARRINHO DE COMPRAS
// ==========================================
document.getElementById('add-to-cart-btn').onclick = function() {
    const select = document.getElementById('m-size');
    const colorSelect = document.getElementById('m-color');
    const containerColor = document.getElementById('container-color');
    
    if (!select || select.selectedIndex === -1) return;
    
    const selectedOption = select.options[select.selectedIndex];
    const priceFromSelect = parseFloat(selectedOption.getAttribute('data-price'));
    const qty = parseInt(document.getElementById('m-qty').value);
    
    let corSelecionada = "Não se aplica";
    if (colorSelect && containerColor && containerColor.style.display !== "none") {
        corSelecionada = colorSelect.options[colorSelect.selectedIndex]?.value || "Não especificada";
    }

    cart.push({
        name: currentProductInModal.name,
        selectedSize: select.value,
        selectedColor: corSelecionada,
        selectedQty: qty,
        priceUnit: priceFromSelect,
        totalItem: (priceFromSelect * qty)
    });
    
    updateCartUI();
    closeModal();
    toggleCart(); 
}

function updateCartUI() {
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    let total = 0;
    
    list.innerHTML = cart.map((item, index) => {
        total += item.totalItem;
        return `
            <div style="border-bottom: 1px solid #eee; padding: 15px 0; font-size: 0.9rem; position: relative;">
                <strong>${item.name}</strong><br>
                <span style="color: var(--grey);">Tipo: ${item.selectedSize}</span> | 
                <span style="color: var(--grey);">Cor: ${item.selectedColor}</span><br>
                <span style="color: var(--grey);">Qtd: ${item.selectedQty}</span><br>
                <span onclick="removeItem(${index})" style="position:absolute; right:15px; top:15px; cursor:pointer; color:red;">X</span>
            </div>
        `;
    }).join('');
    totalEl.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function removeItem(index) { cart.splice(index, 1); updateCartUI(); }
function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('active'); }

// ==========================================
// FINALIZAR PEDIDO NO WHATSAPP
// ==========================================
function checkout() {
    if (cart.length === 0) return alert("Seu carrinho está vazio!");

    const centralNumber = "5583999629222"; 

    let text = "*NOVO PEDIDO - PAULO RENATO REPRESENTAÇÕES*\n";
    text += "----------------------------------\n\n";
    let grandTotal = 0;
    let temConsultar = false;

    cart.forEach((item, i) => {
        const precoFormatado = item.isConsultar 
            ? "Preço a consultar" 
            : `R$ ${item.totalItem.toFixed(2).replace('.', ',')}`;
        
        text += `*${i+1}. ${item.name}*\n`;
        text += `   Tamanho: ${item.selectedSize}\n`;
        text += `   Quantidade: ${item.selectedQty}\n`;
        text += `   Subtotal: ${precoFormatado}\n\n`;
        
        grandTotal += item.totalItem;
        if (item.isConsultar) temConsultar = true;
    });

    text += "----------------------------------\n";
    
    if (temConsultar) {
        text += `*TOTAL: R$ ${grandTotal.toFixed(2).replace('.', ',')} + itens a consultar*\n\n`;
    } else {
        text += `*TOTAL GERAL: R$ ${grandTotal.toFixed(2).replace('.', ',')}*\n\n`;
    }
    
    text += "Gostaria de prosseguir com o pedido.";
    
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${centralNumber}?text=${encoded}`, '_blank'); 
}
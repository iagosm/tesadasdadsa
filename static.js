/*
 * Versão estática do site (sem servidor).
 * Faz no navegador o que antes o Laravel fazia: filtros, buscas e avisos de formulários.
 */
(function () {
    'use strict';

    var normalizar = function (texto) {
        return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    };

    function aviso(mensagem) {
        var el = document.createElement('div');
        el.setAttribute('role', 'status');
        el.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:80;max-width:340px;background:#0B110D;color:#F2F5F0;'
            + 'border:1px solid #2C3A31;border-radius:4px;padding:14px 18px;font-size:14.5px;line-height:1.45';
        var titulo = document.createElement('b');
        titulo.style.color = '#B8FF65';
        titulo.textContent = 'Protótipo · ';
        el.appendChild(titulo);
        el.appendChild(document.createTextNode(mensagem));
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 3200);
    }

    /* ---------- Catálogo: filtros, faixa de preço, ordem e busca ---------- */

    function marcados(form, chave) {
        return Array.prototype.map.call(form.querySelectorAll('input[name="' + chave + '[]"]:checked'), function (i) { return i.value; });
    }

    function filtrarCatalogo(form) {
        var cards = Array.prototype.slice.call(form.querySelectorAll('article[data-preco]'));
        if (!cards.length) {
            return;
        }

        var grade = cards[0].parentNode;
        var facetas = ['condicao', 'armazenamento', 'cor', 'disponibilidade', 'modelo'];
        var escolhas = {};
        facetas.forEach(function (f) { escolhas[f] = marcados(form, f); });
        var minimo = parseFloat(form.querySelector('[name=preco_min]').value);
        var maximo = parseFloat(form.querySelector('[name=preco_max]').value);
        var ordem = form.querySelector('[name=ordem]').value;
        var termo = normalizar(new URLSearchParams(window.location.search).get('q'));

        var visiveis = cards.filter(function (card) {
            var ok = facetas.every(function (f) {
                if (!escolhas[f].length) {
                    return true;
                }
                var valores = (card.getAttribute('data-' + f) || '').split('|');
                return escolhas[f].some(function (v) { return valores.indexOf(v) >= 0; });
            });
            var preco = parseFloat(card.getAttribute('data-preco'));
            ok = ok && (isNaN(minimo) || preco >= minimo) && (isNaN(maximo) || preco <= maximo);
            ok = ok && (!termo || normalizar(card.getAttribute('data-nome') + ' ' + card.textContent).indexOf(termo) >= 0);
            card.style.display = ok ? '' : 'none';
            return ok;
        });

        cards.sort(function (a, b) {
            var pa = parseFloat(a.getAttribute('data-preco')), pb = parseFloat(b.getAttribute('data-preco'));
            if (ordem === 'menor') { return pa - pb; }
            if (ordem === 'maior') { return pb - pa; }
            return parseInt(a.getAttribute('data-ordem'), 10) - parseInt(b.getAttribute('data-ordem'), 10);
        }).forEach(function (card) { grade.appendChild(card); });

        var contador = form.querySelector('p.mb-5');
        if (contador) {
            contador.textContent = visiveis.length + (visiveis.length === 1 ? ' produto' : ' produtos') + (termo ? ' para "' + new URLSearchParams(window.location.search).get('q') + '"' : '');
        }

        var vazio = form.querySelector('[data-vazio]');
        if (!vazio) {
            vazio = document.createElement('div');
            vazio.setAttribute('data-vazio', '');
            vazio.style.cssText = 'border:1px solid #BFC7B8;border-radius:4px;padding:48px 24px;text-align:center;background:#fff';
            vazio.innerHTML = '<p style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:26px;font-weight:700">Não achamos esse aparelho com esses filtros.</p>'
                + '<p style="color:#4B544D;margin-top:10px">Tente remover algum filtro ou fale com um vendedor.</p>';
            grade.parentNode.insertBefore(vazio, grade.nextSibling);
        }
        vazio.style.display = visiveis.length ? 'none' : '';
    }

    function iniciarCatalogo() {
        var form = document.getElementById('filtros');
        if (!form) {
            return;
        }
        form.addEventListener('change', function () { filtrarCatalogo(form); });

        var termo = new URLSearchParams(window.location.search).get('q');
        if (termo) {
            var titulo = form.querySelector('h1');
            if (titulo) {
                titulo.textContent = 'Resultados';
            }
            filtrarCatalogo(form);
        }
    }

    /* ---------- Painel: busca e categoria nas tabelas ---------- */

    function filtrarTabela(form) {
        var busca = form.querySelector('[name=q]');
        var categoria = form.querySelector('select[name=categoria]');
        var termo = normalizar(busca && busca.value);
        var nomeCategoria = categoria && categoria.value ? normalizar(categoria.options[categoria.selectedIndex].text) : '';

        document.querySelectorAll('.table-row').forEach(function (linha) {
            var ok = !termo || normalizar(linha.textContent).indexOf(termo) >= 0;
            if (ok && nomeCategoria && linha.children[2]) {
                ok = normalizar(linha.children[2].textContent) === nomeCategoria;
            }
            linha.style.display = ok ? '' : 'none';
        });
    }

    function iniciarTabelas() {
        document.querySelectorAll('form[data-filtro-tabela]').forEach(function (form) {
            form.addEventListener('input', function () { filtrarTabela(form); });
            form.addEventListener('change', function () { filtrarTabela(form); });
        });
    }

    /* ---------- Minha conta: pedidos por data com período personalizado ---------- */

    function filtrarDatas(form) {
        var de = form.querySelector('[name=de]').value;
        var ate = form.querySelector('[name=ate]').value;

        if (de && ate && ate < de) {
            aviso('A data final precisa ser igual ou depois da inicial.');
            return;
        }

        var visiveis = 0;
        document.querySelectorAll('section[aria-labelledby^="dia-"]').forEach(function (secao) {
            var dia = secao.getAttribute('aria-labelledby').replace('dia-', '');
            var ok = (!de || dia >= de) && (!ate || dia <= ate);
            secao.style.display = ok ? '' : 'none';
            if (ok) { visiveis++; }
        });

        if (!visiveis) {
            aviso('Nenhum pedido nesse período.');
        }
    }

    /* ---------- Formulários ---------- */

    document.addEventListener('submit', function (evento) {
        var form = evento.target;

        if (form.hasAttribute('data-demo')) {
            evento.preventDefault();
            var destino = form.getAttribute('data-go');
            if (destino) {
                window.location.href = destino;
                return;
            }
            aviso('Versão de demonstração: nada é salvo.');
            return;
        }

        if (form.hasAttribute('data-filtro-tabela')) {
            evento.preventDefault();
            filtrarTabela(form);
        } else if (form.hasAttribute('data-filtro-datas')) {
            evento.preventDefault();
            filtrarDatas(form);
        } else if (form.id === 'filtros') {
            evento.preventDefault();
            filtrarCatalogo(form);
        }
    }, true);

    document.addEventListener('DOMContentLoaded', function () {
        iniciarCatalogo();
        iniciarTabelas();
    });
})();

// ==UserScript==
// @name         PrUn Tooltips by Rynx
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Adds FIO powered market tooltips to Apex console
// @author       Manderius (Rynx), inspired by Tim Davis (binarygod, @timthedevguy)
// @match        https://apex.prosperousuniverse.com/
// @grant        none
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.10.0/jquery.min.js
// @require      https://cdn.jsdelivr.net/gh/calebjacob/tooltipster@latest/dist/js/tooltipster.bundle.min.js
// @downloadURL  https://raw.githubusercontent.com/Manderius/PrUn_Tooltips/main/tooltips.js
// @updateURL    https://raw.githubusercontent.com/Manderius/PrUn_Tooltips/main/tooltips.js
// ==/UserScript==

let $ = jQuery;
let prices = [];
let last_update = null;
let updates_on = null;
let newPrices = false;
const styles =
    '.tooltipster-base{display:flex;pointer-events:none;position:absolute!important;font-family:"Droid Sans",sans-serif;font-size:10px;color:#bbb}.tooltipster-box{flex:1 1 auto}.tooltipster-content{box-sizing:border-box;max-height:100%;max-width:100%;overflow:auto}.tooltipster-fade{opacity:0;-webkit-transition-property:opacity;-moz-transition-property:opacity;-o-transition-property:opacity;-ms-transition-property:opacity;transition-property:opacity}.tooltipster-fade.tooltipster-show{opacity:1}.tooltipster-sidetip .tooltipster-box{background:#222;border:1px solid #2b485a;box-shadow:0 0 5px rgba(63,162,222,.5);border-radius:0}.tooltipster-sidetip.tooltipster-right .tooltipster-box{margin-left:0}.tooltipster-sidetip .tooltipster-content{line-height:10px;padding:0}.tooltipster-sidetip .tooltipster-arrow{overflow:hidden;display:none;position:absolute}.tooltipster-content H1{border-bottom:1px solid #2b485a;background-color:rgba(63,162,222,.15);padding-bottom:8px;padding-top:9px;padding-left:10px;margin:0;font-weight:400;padding-right:10px;font-size:12px}';
const tooltip_html = `<table class="PrUnTools_Table">
						<thead>
							<tr>
								<th></th>
								<th>AI1</th>
								<th>CI1</th>
								<th>IC1</th>
								<th>NC1</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Ask</td>
								<td class="accounting-cell">{Ask.AI1}</td>
								<td class="accounting-cell">{Ask.CI1}</td>
								<td class="accounting-cell">{Ask.IC1}</td>
								<td class="accounting-cell">{Ask.NC1}</td>
							</tr>
							<tr>
								<td>Bid</td>
								<td class="accounting-cell">{Buy.AI1}</td>
								<td class="accounting-cell">{Buy.CI1}</td>
								<td class="accounting-cell">{Buy.IC1}</td>
								<td class="accounting-cell">{Buy.NC1}</td>
							</tr>
							<tr>
								<td>Average</td>
								<td class="accounting-cell">{Avg.AI1}</td>
								<td class="accounting-cell">{Avg.CI1}</td>
								<td class="accounting-cell">{Avg.IC1}</td>
								<td class="accounting-cell">{Avg.NC1}</td>
							</tr>
							<tr class="top-border-cell">
								<td>Supply</td>
								<td class="accounting-cell">{Supply.AI1}</td>
								<td class="accounting-cell">{Supply.CI1}</td>
								<td class="accounting-cell">{Supply.IC1}</td>
								<td class="accounting-cell">{Supply.NC1}</td>
							</tr>
							<tr>
								<td>Demand</td>
								<td class="accounting-cell">{Demand.AI1}</td>
								<td class="accounting-cell">{Demand.CI1}</td>
								<td class="accounting-cell">{Demand.IC1}</td>
								<td class="accounting-cell">{Demand.NC1}</td>
							</tr>
						</tbody>
						<tfoot>
							<tr class="bottom-border-cell">
								<td colspan="5">Updates on {UPDATE}</td>
							</tr>
						</tfoot>
					</table>`;

function create_tooltips(data) {
    // Create any missing tooltip content placeholder
    data.tickers.forEach(function (item) {
        if ($(`#tooltip_${item}`).length == 0) {
            // Create our element
            $("BODY").append(
                $("<DIV />")
                    .attr("style", "display:none;")
                    .append(
                        $("<DIV />")
                            .attr("id", `tooltip_${item}`)
                            .addClass("PrUn_tooltip_content")
                    )
            );
        }
    });
    //Loop through elements and configure to use tooltips
    data.elements.each(function (i, item) {
        if (!$(item).parent().parent().hasClass("PrUn_tooltip")) {
            let ticker = item.innerHTML;
            let title = $(item).parent().parent().attr("title");
            $(`#tooltip_${ticker}`).attr("data-title", title);
            $(item)
                .parent()
                .parent()
                .attr("data-tooltip-content", `#tooltip_${ticker}`);
            $(item).parent().parent().addClass("PrUn_tooltip");
        }
    });
}

function getPrices(callback) {
    // Check if last_update is null or if now is past the updates on
    if (!last_update || new Date() > updates_on) {
        // Get market data from FIO
        $.ajax({
            type: "GET",
            url: "https://rest.fnar.net/exchange/all",
            success: function (output, status, xhr) {
                // Grab data
                prices = output;
                // Set last update to now
                last_update = new Date();
                // Set updates_on to 5 minutes from now
                updates_on = new Date(last_update.getTime() + 5 * 60000);

                newPrices = true;

                callback(output);
            },
            error: function (output) {
                console.log("Error in API call");
            },
        });
    } else {
        // No update needed go ahead and parse the data
        callback(prices);
    }
}

function prepareTooltips(prices, isNewPrice) {
    const tickers = new Set(prices.map((row) => row.MaterialTicker));
    tickers.forEach((ticker) => {
        if (!isNewPrice && $(`#tooltip_${ticker}`).length !== 0) {
            return;
        }
        $(`#tooltip_${ticker}`).remove();
        let html = tooltip_html.replace(
            "{UPDATE}",
            updates_on.toLocaleString()
        );
        // Find Material in FIO data
        let market_data = prices.filter((obj) => {
            return obj.MaterialTicker === ticker;
        });
        // Filter should return all 4 markets worth of data, populate our tooltip
        market_data.forEach(function (ticker_data) {
            html = html.replace(
                `{Ask.${ticker_data.ExchangeCode}}`,
                ticker_data.Ask ? ticker_data.Ask.toLocaleString() : "null"
            );
            html = html.replace(
                `{Buy.${ticker_data.ExchangeCode}}`,
                ticker_data.Bid ? ticker_data.Bid.toLocaleString() : "null"
            );
            html = html.replace(
                `{Avg.${ticker_data.ExchangeCode}}`,
                ticker_data.PriceAverage
                    ? ticker_data.PriceAverage.toLocaleString()
                    : "null"
            );
            html = html.replace(
                `{Supply.${ticker_data.ExchangeCode}}`,
                ticker_data.Supply
                    ? ticker_data.Supply.toLocaleString()
                    : "null"
            );
            html = html.replace(
                `{Demand.${ticker_data.ExchangeCode}}`,
                ticker_data.Demand
                    ? ticker_data.Demand.toLocaleString()
                    : "null"
            );
        });
        // Replace any nulls with '--'
        html = html.replaceAll("null", "--");
        // Add tooltip to box
        $("BODY").append(
            $("<DIV />")
                .attr("style", "display:none;")
                .append(
                    $("<DIV />")
                        .attr("id", `tooltip_${ticker}`)
                        .addClass("PrUn_tooltip_content")
                )
        );

        $(`#tooltip_${ticker}`).html(`<h1>TITLE-REPLACE</h1>${html}`);
    });
}

function addTooltipToItem(item) {
    $(item)
        .parent()
        .parent()
        .attr("data-tooltip-content", `#tooltip_${item.innerHTML}`);
    let title = $(item).parent().parent().attr("title");
    $(item).parent().parent().addClass("PrUn_tooltip");
    if ($(`#tooltip_${item.innerHTML}:contains(TITLE-REPLACE)`).length > 0) {
        $(`#tooltip_${item.innerHTML}`).html(
            $(`#tooltip_${item.innerHTML}`)
                .html()
                .replace("TITLE-REPLACE", title)
        );
    }
}

function addTooltipsToItems() {
    let matIconContClass = "MaterialIcon__container___q8gKIx8";
    let coloredIconClass = "ColoredIcon__label___OU1I4oP";

    const elements =
        $(`.${matIconContClass}[style*="height: 48px"] span.${coloredIconClass},
			            .${matIconContClass}[style*="height: 33px"] span.${coloredIconClass},
                        .${matIconContClass}[style*="height: 28px"] span.${coloredIconClass}`);
    Array.from(elements).forEach((item) => {
        addTooltipToItem(item);
    });
}

function activateTooltips() {
    try {
        $(".PrUn_tooltip").tooltipster("destroy");
    } catch {}

    $(".PrUn_tooltip").tooltipster({
        position: "right",
        contentAsHTML: true,
        contentCloning: true,
        arrow: false,
        hideOnClick: true,
    });
}

function setupTooltips() {
    const load = (priceData) => {
        prepareTooltips(priceData, newPrices);
        newPrices = false;
        addTooltipsToItems();
        activateTooltips();
    };

    getPrices(load);
}

function monitorOnElementCreated(selector, callback, onlyOnce = true) {
    const getElementsFromNodes = (nodes) =>
        Array.from(nodes)
            .flatMap((node) =>
                node.nodeType === 3
                    ? null
                    : Array.from(node.querySelectorAll(selector))
            )
            .filter((item) => item !== null);
    let onMutationsObserved = function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                const elements = getElementsFromNodes(mutation.addedNodes);
                for (let i = 0; i < elements.length; i++) {
                    callback(elements[i]);
                    if (onlyOnce) observer.disconnect();
                    return;
                }
            }
        });
    };

    let containerSelector = "body";
    let target = document.querySelector(containerSelector);
    let config = { childList: true, subtree: true };
    let MutationObserver =
        window.MutationObserver || window.WebKitMutationObserver;
    let observer = new MutationObserver(onMutationsObserved);
    observer.observe(target, config);
}

function addStyle(styleString) {
    var style = document.createElement("style");
    style.type = "text/css";
    if (style.styleSheet) {
        style.styleSheet.cssText = styleString;
    } else {
        style.appendChild(document.createTextNode(styleString));
    }
    document.getElementsByTagName("head")[0].appendChild(style);
}

function waitForApexLoad() {
    const setup = () => {
        addStyle(styles);
        setupTooltips();
        const insideFrameSelector = ".MaterialIcon__container___q8gKIx8";
        monitorOnElementCreated(
            insideFrameSelector,
            () => setTimeout(setupTooltips, 100),
            false
        );
    };

    const selector = "#TOUR_TARGET_BUTTON_BUFFER_NEW";
    monitorOnElementCreated(selector, setup);
}

(function () {
    "use strict";
    waitForApexLoad();
})();

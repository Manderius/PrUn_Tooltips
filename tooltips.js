// ==UserScript==
// @name         PrUn Tooltips by Rynx
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Adds FIO powered market tooltips to Apex console
// @author       Manderius (Rynx), inspired by Tim Davis (binarygod, @timthedevguy)
// @match        https://apex.prosperousuniverse.com/
// @grant        none
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.10.0/jquery.min.js
// @downloadURL  https://raw.githubusercontent.com/Manderius/PrUn_Tooltips/main/tooltips.js
// @updateURL    https://raw.githubusercontent.com/Manderius/PrUn_Tooltips/main/tooltips.js
// ==/UserScript==

let $ = jQuery;
let prices = [];
let last_update = null;
let updates_on = null;
const styles =
    '.prun-tooltip-base{display:flex;pointer-events:none;position:absolute!important;font-family:"Droid Sans",sans-serif;font-size:10px;color:#bbb;z-index:100000;}.prun-tooltip-box{flex:1 1 auto}.prun-tooltip-content{box-sizing:border-box;max-height:100%;max-width:100%;overflow:auto}.prun-tooltip-fade{opacity:0;-webkit-transition-property:opacity;-moz-transition-property:opacity;-o-transition-property:opacity;-ms-transition-property:opacity;transition-property:opacity}.prun-tooltip-fade.prun-tooltip-show{opacity:1}.prun-tooltip-sidetip .prun-tooltip-box{background:#222;border:1px solid #2b485a;box-shadow:0 0 5px rgba(63,162,222,.5);border-radius:0}.prun-tooltip-sidetip.prun-tooltip-right .prun-tooltip-box{margin-left:0}.prun-tooltip-sidetip .prun-tooltip-content{line-height:10px;padding:0}.prun-tooltip-sidetip .prun-tooltip-arrow{overflow:hidden;display:none;position:absolute}.prun-tooltip-content H1{border-bottom:1px solid #2b485a;background-color:rgba(63,162,222,.15);padding-bottom:8px;padding-top:9px;padding-left:10px;margin:0;font-weight:400;padding-right:10px;font-size:12px}';
const tooltip_html = `
<div
  class="prun-tooltip-base prun-tooltip-sidetip prun-tooltip-right prun-tooltip-fade prun-tooltip-show"
>
  <div class="prun-tooltip-box" style="margin: 0px">
    <div class="prun-tooltip-content">
      <div class="PrUn_tooltip_content">
        <h1>{TITLE}</h1>
        <table class="PrUnTools_Table">
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
        </table>
      </div>
    </div>
  </div>
</div>
`;
const tooltip_html_nodata = `
<div
  class="prun-tooltip-base prun-tooltip-sidetip prun-tooltip-right prun-tooltip-fade prun-tooltip-show"
>
  <div class="prun-tooltip-box" style="margin: 0px">
    <div class="prun-tooltip-content">
      <div class="PrUn_tooltip_content">
        <h1>{TITLE}</h1>
      </div>
    </div>
  </div>
</div>
`;

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

                callback(output);
            },
            error: function () {
                console.log("Error in API call");
            },
        });
    } else {
        // No update needed go ahead and parse the data
        callback(prices);
    }
}

function generateTooltipContent(ticker, title) {
    let html = tooltip_html.replace("{UPDATE}", updates_on.toLocaleString());
    // Find Material in FIO data
    let market_data = prices.filter((obj) => {
        return obj.MaterialTicker === ticker;
    });
    if (market_data.length === 0) {
        return createElement(tooltip_html_nodata.replace("{TITLE}", title));
    }
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
            ticker_data.Supply ? ticker_data.Supply.toLocaleString() : "null"
        );
        html = html.replace(
            `{Demand.${ticker_data.ExchangeCode}}`,
            ticker_data.Demand ? ticker_data.Demand.toLocaleString() : "null"
        );
        html = html.replace(`{TITLE}`, title);
    });
    // Replace any nulls with '--'
    html = html.replaceAll("null", "--");
    return createElement(html);
}

function createElement(html) {
    var div = document.createElement("div");
    div.innerHTML = html.trim();
    return div.firstChild;
}

function showTooltip(item, ticker) {
    if ($(`#tooltip_${ticker}`).length > 0) {
        return document.getElementById(`tooltip_${ticker}`);
    }
    const title = $(item).attr("title");
    const content = generateTooltipContent(ticker, title);
    content.id = `tooltip_${ticker}`;

    // Positioning
    document.body.appendChild(content);

    const positionFromLeft =
        item.getBoundingClientRect().right + item.offsetWidth / 6;
    const canFitOnRight =
        positionFromLeft + content.offsetWidth < window.innerWidth;
    if (canFitOnRight) {
        content.style.left = positionFromLeft + "px";
    } else {
        content.style.left =
            item.getBoundingClientRect().left -
            item.offsetWidth / 6 -
            content.offsetWidth +
            "px";
    }

    let positionFromTop =
        item.getBoundingClientRect().top +
        item.offsetHeight / 2 -
        content.offsetHeight / 2;
    const doesBottomOverflow =
        positionFromTop + content.offsetHeight > window.innerHeight;
    const doesTopOverflow = positionFromTop < 0;
    if (doesBottomOverflow) {
        content.style.top =
            window.innerHeight - content.offsetHeight - 3 + "px";
    } else if (doesTopOverflow) {
        content.style.top = "3px";
    } else {
        content.style.top = positionFromTop + "px";
    }

    return content;
}

function hideTooltip(tooltip) {
    tooltip.remove();
}

function addEventListenersToItems(items) {
    items.forEach((item) => {
        const ticker = $(item).find(".ColoredIcon__label___OU1I4oP").text();
        $(item).children().attr("title", "");
        let tooltip;
        item.addEventListener("mouseover", (event) => {
            event.preventDefault();
            tooltip = showTooltip(item, ticker);
        });
        item.addEventListener("mouseout", () => {
            hideTooltip(tooltip);
        });
    });
}

function setupTooltips(items) {
    const load = () => {
        addEventListenersToItems(items);
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
                if (elements && elements.length > 0) {
                    if (onlyOnce) {
                        observer.disconnect();
                        callback(elements[0]);
                        return;
                    }
                    callback(elements);
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
    if (style.styleSheet) {
        style.styleSheet.cssText = styleString;
    } else {
        style.appendChild(document.createTextNode(styleString));
    }
    document.getElementsByTagName("head")[0].appendChild(style);
}

function waitForApexLoad() {
    getPrices(() => {});
    const insideFrameSelector = ".ColoredIcon__container___djaR4r2";
    monitorOnElementCreated(
        insideFrameSelector,
        (items) => setTimeout(() => setupTooltips(items), 100),
        false
    );

    const onLoad = () => {
        addStyle(styles);
    };

    const selector = "#TOUR_TARGET_BUTTON_BUFFER_NEW";
    monitorOnElementCreated(selector, onLoad);
}

(function () {
    "use strict";
    waitForApexLoad();
})();

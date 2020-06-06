/**
 * @author Felix Müller aka syl3r86
 * @version 0.2.0
 */

// Creature Sizes
ACTORSIZES = {
	"Normal": "normal",
	"Large": "large",
	"Huge": "huge",
	"2x": "double strenght",
	"3x": "triple strenght"
};


class PowerBrowser extends Application {
    
    async initializeContent() {
        // load settings
        if (this.settings === undefined) {
            this.initSettings();
        }
        this.loadPowers().then(obj => {
            this.powers = obj;
        });
        this.loadNpcs().then(obj => {
        	this.npcs = obj;
        });
        await loadTemplates([
            "modules/compendium-browser-13thage/template/power-browser.html",
            "modules/compendium-browser-13thage/template/npc-browser.html",
            "modules/compendium-browser-13thage/template/filter-container.html",
            "modules/compendium-browser-13thage/template/settings.html"
        ]);

        this.hookCompendiumList();

        this.powerFilters = {
            registeredFilterCategorys: {},
            activeFilters: {}
        };
        this.npcFilters = {
            registeredFilterCategorys: {},
            activeFilters: {}
        };
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "power" }],
            classes: options.classes.concat('compendium-browser'),
            template: "modules/compendium-browser-13thage/template/template.html",
            width: 800,
            height: 700,
            resizable: true,
            minimizable: true,
            title: "Compendium Browser 13th Age"
        });
        return options;
    }

    hookCompendiumList() {
        Hooks.on('renderCompendiumDirectory', (app, html, data) => {
            if (this.settings === undefined) {
                this.initSettings();
            }
            if (game.user.isGM || this.settings.allowPowerBrowser || this.settings.allowNpcBrowser) {
                const importButton = $(`<button class="compendium-browser-btn"><i class="fas fa-fire"></i> ${game.i18n.localize("CMPBrowser.compendiumBrowser")}</button>`);
                html.find('.compendium-browser-btn').remove();

                // adding to directory-list since the footer doesn't exist if the user is not gm
                html.find('.directory-footer').append(importButton);

                // Handle button clicks
                importButton.click(ev => {
                    ev.preventDefault();
                    this.render(true);
                });
            }
        });
    }

    async getData() {
        if (!this.powerLoaded) {
            // spells will be stored locally to not require full loading each time the browser is opened
            this.powers = await this.loadPowers();
            this.powersLoaded = true;
        }

        let data = {};
        data.powerss = this.powers;
        data.powerFilters = this.powerFilters;
        data.showPowerBrowser = (game.user.isGM || this.settings.allowPowerBrowser);
        data.npcs = this.npcs;
        data.npcFilters = this.npcFilters;
        data.showNpcBrowser = (game.user.isGM || this.settings.allowNpcBrowser);
        data.settings = this.settings;
        data.isGM = game.user.isGM;
        return data;
    }

    async loadPowers() {
        console.log('Power Browser | Started loading powers');

        if (this.classList === undefined) {
            this.classList = await fetch('modules/compendium-browser-13thage/power-classes.json').then(result => {
                return result.json();
            }).then(obj => {
                return this.classList = obj;
            });
        }

        this.powersLoaded = false;
        this.powersLoading = true;
        
        let unfoundPowers = '';

        let powers = {};

        for (let pack of game.packs) {
            if (pack['metadata']['entity'] == "Item" && this.settings.loadedPowerCompendium[pack.collection].load) {
                await pack.getContent().then(content => {
                    for (let power of content) {
                        power = power.data;
                        if (power.type == 'power') {

                            power.compendium = pack.collection;

                            // determining classes that can use the spell
                            let cleanPowerName = power.name.toLowerCase().replace(/[^一-龠ぁ-ゔァ-ヴーa-zA-Z0-9ａ-ｚＡ-Ｚ０-９々〆〤]/g, '').replace("'", '').replace(/ /g, '');
                            //let cleanSpellName = spell.name.toLowerCase().replace(/[^a-zA-Z0-9\s:]/g, '').replace("'", '').replace(/ /g, '');
                            if (this.classList[cleanPowerName] !== undefined) {
                                let classes = this.classList[cleanPowerName];
                                power.data.classes = classes.split(',');
                            } else {
                                unfoundPowers += cleanPowerName + ',';
                            }
//
//                            // getting damage types
//                            spell.damageTypes = [];
//                            if (spell.data.damage && spell.data.damage.parts.length > 0) {
//                                for (let part of spell.data.damage.parts) {
//                                    let type = part[1];
//                                    if (spell.damageTypes.indexOf(type) === -1) {
//                                        spell.damageTypes.push(type);
//                                    }
//                                }
//                            }
//
                            powers[(power._id)] = power;
                        }
                    }
                });
            }
        }
        if (unfoundPowers !== '') {
            console.log(`Power Browser | List of Powers that don't have a class assosiated to them:`);
            console.log(unfoundPowers);
        }        
        console.log('Power Browser | Finished loading powers');
        return powers;
    }
    
    async loadNpcs() {
        console.log('NPC Browser | Started loading NPCs');

        let npcs = {};

        for (let pack of game.packs) {
            if (pack['metadata']['entity'] == "Actor" && this.settings.loadedNpcCompendium[pack.collection].load) {
                await pack.getContent().then(async content => {
                    for (let npc of content) {
                        npc = npc.data;
                        // add needed data
                        npc.compendium = pack.collection;
                        // level display
                        let lvl = npc.data.attributes.level.value;
                        if (lvl == undefined || lvl == '') lvl = 0;
                        else lvl = Number(lvl);
                        //if ( > 0 && cr < 1) cr = "1/" + (1 / cr);
                        npc.displayLvl = lvl;
                        let size = npc.data.details.size.value
                        if (ACTORSIZES[size] !== undefined) {
                            npc.displaySize = ACTORSIZES[size];
                        }
                        switch (size) {
                            case 'Normal': npc.filterSize = 5; break;
                            case 'Large': npc.filterSize = 4; break;
                            case 'Huge': npc.filterSize = 3; break;
                            case '2x': npc.filterSize = 2; break;
                            case '3x': npc.filterSize = 1; break;
                            default: npc.filterSize = 5; break;
                        }
                        let type = npc.data.details.size.value
                        // getting value for HasSpells and damage types
//                        npc.hasSpells = false;
//                        npc.damageDealt = [];
//                        for (let item of npc.items) {
//                            if (item.type == 'spell') {
//                                npc.hasSpells = true;
//                            }
//                            if (item.data.damage && item.data.damage.parts && item.data.damage.parts.length > 0) {
//                                for (let part of item.data.damage.parts) {
//                                    let type = part[1];
//                                    if (npc.damageDealt.indexOf(type) === -1) {
//                                        npc.damageDealt.push(type);
//                                    }
//                                }
//                            }
//                        }
//
                        npcs[npc._id] = npc;
                    }
                });
            }
        }
        console.log('NPC Browser | Finished loading NPCs');
        return npcs;
    }
    
    activateListeners(html) {
        super.activateListeners(html);
        // localizing title
        $(html).parents('.app').find('.window-title')[0].innerText = game.i18n.localize("CMPBrowser.compendiumBrowser");

        // show entity sheet
        html.find('.item-edit').click(ev => {
            let itemId = $(ev.currentTarget).parents("li").attr("data-entry-id");
            let compendium = $(ev.currentTarget).parents("li").attr("data-entry-compendium");
            let pack = game.packs.find(p => p.collection === compendium);
            pack.getEntity(itemId).then(entity => {
                entity.sheet.render(true);
            });
        });

        // make draggable
        html.find('.draggable').each((i, li) => {
            li.setAttribute("draggable", true);
            li.addEventListener('dragstart', event => {
                let packName = li.getAttribute("data-entry-compendium");
                let pack = game.packs.find(p => p.collection === packName);
                if (!pack) {
                    event.preventDefault();
                    return false;
                }
                event.dataTransfer.setData("text/plain", JSON.stringify({
                    type: pack.entity,
                    pack: pack.collection,
                    id: li.getAttribute("data-entry-id")
                }));
            }, false);
        });

        // toggle visibility of filter containers
        html.find('.filtercontainer h3, .multiselect label').click(async ev => {
            await $(ev.target.nextElementSibling).toggle(100);

        });
        html.find('.multiselect label').trigger('click');

        // sort spell list
//        html.find('.spell-browser select[name=sortorder]').on('change', ev => {
//            let spellList = html.find('.spell-browser li');
//            let byName = (ev.target.value == 'true');
//            let sortedList = this.sortSpells(spellList, byName);
//            let ol = $(html.find('.spell-browser ul'));
//            ol[0].innerHTML = [];
//            for (let element of sortedList) {
//                ol[0].append(element);
//            }
//        });
        html.find('.power-browser select[name=sortorder]').trigger('change');

        // sort npc list
        html.find('.npc-browser select[name=sortorder]').on('change', ev => {
            let npcList = html.find('.npc-browser li');
            let orderBy = ev.target.value;
            let sortedList = this.sortNpcs(npcList, orderBy);
            let ol = $(html.find('.npc-browser ul'));
            ol[0].innerHTML = [];
            for (let element of sortedList) {
                ol[0].append(element);
            }
        });
        html.find('.npc-browser select[name=sortorder]').trigger('change')

        // reset filters
        html.find('#reset-power-filter').click(ev => {
            this.powerFilters.activeFilters = {};
            this.render();
        });

        html.find('#reset-npc-filter').click(ev => {
            this.npcFilters.activeFilters = {};
            this.render();
        });

        // settings
        html.find('.settings input').on('change', ev => {
            let setting = ev.target.dataset.setting;
            let value = ev.target.checked;
            if (setting === 'power-compendium-setting') {
                let key = ev.target.dataset.key;
                this.settings.loadedPowerCompendium[key].load = value;
                this.loadPowers().then((powers) => {
                    this.powers = powers;
                    this.render();
                });
                ui.notifications.info("Settings Saved. Power Compendiums are being reloaded.");
            } else if (setting === 'npc-compendium-setting') {
                let key = ev.target.dataset.key;
                this.settings.loadedNpcCompendium[key].load = value;
                this.loadNpcs().then((npcs) => {
                    this.npcs = npcs;
                    this.render();
                });
                ui.notifications.info("Settings Saved. NPC Compendiums are being reloaded.");
            }
            if (setting === 'allow-power-browser') {
                this.settings.allowPowrBrowser = value;
            }
            if (setting === 'allow-npc-browser') {
                this.settings.allowNpcBrowser = value;
            }
            this.saveSettings();
        });


        // activating or deactivating filters

        // text filters

        html.find('.filter[data-type=text] input, .filter[data-type=text] select').on('keyup change paste', ev => {
            let path = $(ev.target).parents('.filter').data('path');
            let key = path.replace(/\./g, '');
            let value = ev.target.value;
            let itemType = $(ev.target).parents('.tab').data('tab');

            let filterTarget = `${itemType}Filters`;

            if (value === '' || value === undefined) {
                delete this[filterTarget].activeFilters[key];
            } else {
                this[filterTarget].activeFilters[key] = {
                    path: path,
                    type: 'text',
                    valIsArray: false,
                    value: ev.target.value
                }
            }

            let list = null;
            let subjects = null;
            if (itemType === 'power') {
                list = html.find('.power-browser li');
                subjects = this.powers;
            } else if (itemType === 'npc') {
                list = html.find('.npc-browser li');
                subjects = this.npcs;
            }
            this.filterElements(list, subjects, this[filterTarget].activeFilters);
        });

        // select filters
        html.find('.filter[data-type=select] select, .filter[data-type=bool] select').on('change', ev => {
            let path = $(ev.target).parents('.filter').data('path');
            let key = path.replace(/\./g, '');
            let filterType = $(ev.target).parents('.filter').data('type');
            let itemType = $(ev.target).parents('.tab').data('tab');
            let valIsArray = $(ev.target).parents('.filter').data('valisarray');
            if (valIsArray === 'true') valIsArray = true;
            let value = ev.target.value;
            if (value === 'false') value = false;
            if (value === 'true') value = true;

            let filterTarget = `${itemType}Filters`;

            if (value === "null") {
                delete this[filterTarget].activeFilters[key]
            } else {
                this[filterTarget].activeFilters[key] = {
                    path: path,
                    type: filterType,
                    valIsArray: valIsArray,
                    value:value
                }
            }

            let list = null;
            let subjects = null;
            if (itemType === 'power') {
                list = html.find('.power-browser li');
                subjects = this.powers;
            } else if (itemType === 'npc') {
                list = html.find('.npc-browser li');
                subjects = this.npcs;
            }
            this.filterElements(list, subjects, this[filterTarget].activeFilters);
        });

        // multiselect filters
        html.find('.filter[data-type=multiSelect] input').on('change', ev => {
            let path = $(ev.target).parents('.filter').data('path');
            let key = path.replace(/\./g, '');
            let filterType = 'multiSelect';
            let itemType = $(ev.target).parents('.tab').data('tab');
            let valIsArray = $(ev.target).parents('.filter').data('valisarray');
            if (valIsArray === 'true') valIsArray = true;
            let value = $(ev.target).data('value');

            let filterTarget = `${itemType}Filters`;
            let filter = this[filterTarget].activeFilters[key];

            if (ev.target.checked === true) {
                if (filter === undefined) {
                    this[filterTarget].activeFilters[key] = {
                        path: path,
                        type: filterType,
                        valIsArray: valIsArray,
                        values: [ value ]
                    }
                } else {
                    this[filterTarget].activeFilters[key].values.push(value);
                }
            } else {
                delete this[filterTarget].activeFilters[key].values.splice(this[filterTarget].activeFilters[key].values.indexOf(value),1);
                if (this[filterTarget].activeFilters[key].values.length === 0) {
                    delete this[filterTarget].activeFilters[key];
                }
            }

            let list = null;
            let subjects = null;
            if (itemType === 'power') {
                list = html.find('.power-browser li');
                subjects = this.powers;
            } else if (itemType === 'npc') {
                list = html.find('.npc-browser li');
                subjects = this.npcs;
            }
            this.filterElements(list, subjects, this[filterTarget].activeFilters);
        });


        html.find('.filter[data-type=numberCompare] select, .filter[data-type=numberCompare] input').on('change keyup paste', ev => {
            let path = $(ev.target).parents('.filter').data('path');
            let key = path.replace(/\./g, '');
            let filterType = 'numberCompare';
            let itemType = $(ev.target).parents('.tab').data('tab');
            let valIsArray = false;

            let operator = $(ev.target).parents('.filter').find('select').val();
            let value = $(ev.target).parents('.filter').find('input').val();

            let filterTarget = `${itemType}Filters`;

            if (value === '' || operator === 'null') {
                delete this[filterTarget].activeFilters[key]
            } else {
                this[filterTarget].activeFilters[key] = {
                    path: path,
                    type: filterType,
                    valIsArray: valIsArray,
                    operator: operator,
                    value: value
                }
            }

            let list = null;
            let subjects = null;
            if (itemType === 'power') {
                list = html.find('.power-browser li');
                subjects = this.powers;
            } else if (itemType === 'npc') {
                list = html.find('.npc-browser li');
                subjects = this.npcs;
            }
            this.filterElements(list, subjects, this[filterTarget].activeFilters);
        });

    }

    sortPowers(list, byName) {
        if(byName) {
            list.sort((a, b) => {
                let aName = $(a).find('.power-name a')[0].innerHTML;
                let bName = $(b).find('.power-name a')[0].innerHTML;
                if (aName < bName) return -1;
                if (aName > bName) return 1;
                return 0;
            });
        } else {
            list.sort((a, b) => {
                let aVal = $(a).find('input[name=level]').val();
                let bVal = $(b).find('input[name=level]').val();
                if (aVal < bVal) return -1;
                if (aVal > bVal) return 1;
                if (aVal == bVal) {
                    let aName = $(a).find('.power-name a')[0].innerHTML;
                    let bName = $(b).find('.power-name a')[0].innerHTML;
                    if (aName < bName) return -1;
                    if (aName > bName) return 1;
                    return 0;
                }
            });
        }
        return list;
    }

    sortNpcs(list, orderBy) {

        switch (orderBy) {
            case 'name':
                list.sort((a, b) => {
                    let aName = $(a).find('.npc-name a')[0].innerHTML;
                    let bName = $(b).find('.npc-name a')[0].innerHTML;
                    if (aName < bName) return -1;
                    if (aName > bName) return 1;
                    return 0;
                }); break;
            case 'lvl':
                list.sort((a, b) => {
                    let aVal = Number($(a).find('input[name="order.lvl"]').val());
                    let bVal = Number($(b).find('input[name="order.lvl"]').val());
                    console.log(aVal);
                    console.log(bVal);
                    if (aVal < bVal) return -1;
                    if (aVal > bVal) return 1;
                    if (aVal == bVal) {
                        let aName = $(a).find('.npc-name a')[0].innerHTML;
                        let bName = $(b).find('.npc-name a')[0].innerHTML;
                        if (aName < bName) return -1;
                        if (aName > bName) return 1;
                        return 0;
                    }
                }); break;
            case 'size':
                list.sort((a, b) => {
                    let aVal = $(a).find('input[name="order.size"]').val();
                    let bVal = $(b).find('input[name="order.size"]').val();
                    if (aVal < bVal) return -1;
                    if (aVal > bVal) return 1;
                    if (aVal == bVal) {
                        let aName = $(a).find('.npc-name a')[0].innerHTML;
                        let bName = $(b).find('.npc-name a')[0].innerHTML;
                        if (aName < bName) return -1;
                        if (aName > bName) return 1;
                        return 0;
                    }
                }); break;
        }
        return list;
    }

    filterElements(list, subjects, filters) {
        for (let element of list) {
            let subject = subjects[element.dataset.entryId];
            if (this.getFilterResult(subject, filters) == false) {
                $(element).hide();
            } else {
                $(element).show();
            }
        }
    }

    getFilterResult(subject, filters) {
        for (let filterKey in filters) {
            let filter = filters[filterKey];
            let prop = getProperty(subject, filter.path);
            if (filter.type === 'numberCompare') {

                switch (filter.operator) {
                    case '=': if (prop != filter.value) { return false; } break;
                    case '<': if (prop >= filter.value) { return false; } break;
                    case '>': if (prop <= filter.value) { return false; } break;
                }

                continue;
            }
            if (filter.valIsArray === false) {
                if (filter.type === 'text') {
                    if (prop.toLowerCase().indexOf(filter.value.toLowerCase()) === -1) {
                        return false;
                    }
                } else {
                    if (filter.value !== undefined && prop !== undefined && prop != filter.value && !(filter.value === true && prop)) {
                        return false;
                    }
                    if (filter.values && filter.values.indexOf(prop) === -1) {
                        return false;
                    }
                }
            } else {
                if (prop === undefined) return false;
                if (typeof prop === 'object') {
                    if (filter.value) {
                        if (prop.indexOf(filter.value) === -1) {
                            return false;
                        }
                    } else if(filter.values) {
                        for (let val of filter.values) {
                            if (prop.indexOf(val) !== -1) {
                                continue;
                            }
                            return false;
                        }
                    }
                } else {
                    console.log(prop);
                    for (let val of filter.values) {
                        if (prop === val) {
                            continue;
                        }
                    }
                    return false;
                }
            }
        }

        return true;
    }

    clearObject(obj) {
        let newObj = {};
        for (let key in obj) {
            if (obj[key] == true) {
                newObj[key] = true;
            }
        }
        return newObj;
    }

    initSettings() {
        let defaultSettings = {
            loadedPowerCompendium: {},
            loadedNpcCompendium: {},
        };
        for (let compendium of game.packs) {
            if (compendium['metadata']['entity'] == "Item") {
                defaultSettings.loadedPowerCompendium[compendium.collection] = {
                    load: true,
                    name: `${compendium['metadata']['label']} (${compendium.collection})`
                };
            }
            if (compendium['metadata']['entity'] == "Actor") {
                defaultSettings.loadedNpcCompendium[compendium.collection] = {
                    load: true,
                    name: `${compendium['metadata']['label']} (${compendium.collection})`
                };
            }
        }
        // creating game setting container
        game.settings.register("compendiumBrowser", "settings", {
            name: "Compendium Browser Settings",
            hint: "Settings to exclude packs from loading and visibility of the browser",
            default: defaultSettings,
            type: Object,
            scope: 'world',
            onChange: settings => {
                this.settings = settings;
            }
        });
        
        // load settings from container and apply to default settings (available compendie might have changed)
        let settings = game.settings.get('compendiumBrowser', 'settings');
//        for (let compKey in defaultSettings.loadedPowerCompendium) {
//            if (settings.loadedPowerCompendium[compKey] !== undefined) {
//                defaultSettings.loadedPowerCompendium[compKey].load = settings.loadedPowerCompendium[compKey].load;
//            }
//        }
        for (let compKey in defaultSettings.loadedNpcCompendium) {
            if (settings.loadedNpcCompendium[compKey] !== undefined) {
                defaultSettings.loadedNpcCompendium[compKey].load = settings.loadedNpcCompendium[compKey].load;
            }
        }
        defaultSettings.allowPowerBrowser = settings.allowPowerBrowser;
        defaultSettings.allowNpcBrowser = settings.allowNpcBrowser;
        if (game.user.isGM) {
            game.settings.set('compendiumBrowser', 'settings', defaultSettings);
        }   
        this.settings = defaultSettings;
    }

    saveSettings() {
        game.settings.set('compendiumBrowser', 'settings', this.settings);
    }

    addFilter(entityType, category, label, path, type, possibleValues = null, valIsArray = false) {
        let target = `${entityType}Filters`;
        let filter = {};
        filter.path = path;
        filter.label = label;
        filter.type = 'text';
        if (['text', 'bool', 'select', 'multiSelect', 'numberCompare'].indexOf(type) !== -1) {
            filter[`is${type}`] = true;
            filter.type = type;
        }
        if (possibleValues !== null) {
            filter.possibleValues = possibleValues;
        }
        filter.valIsArray = valIsArray;

        let catId = category.replace(/\W/g, '');
        if (this[target].registeredFilterCategorys[catId] === undefined) {
            this[target].registeredFilterCategorys[catId] = { label: category, filters: [] };
        }
        this[target].registeredFilterCategorys[catId].filters.push(filter);

    }

    /**
     * Used to add custom filters to the Spell-Browser
     * @param {String} category - Title of the category
     * @param {String} label - Title of the filter
     * @param {String} path - path to the data that the filter uses. uses dotnotation. example: data.abilities.dex.value
     * @param {String} type - type of filter
     *                      possible filter:
     *                          text:           will give a textinput (or use a select if possibleValues has values) to compare with the data. will use objectData.indexOf(searchedText) to enable partial matching
     *                          bool:           will see if the data at the path exists and not false.
     *                          select:         exactly matches the data with the chosen selector from possibleValues
     *                          multiSelect:    enables selecting multiple values from possibleValues, any of witch has to match the objects data
     *                          numberCompare:  gives the option to compare numerical values, either with =, < or the > operator
     * @param {Boolean} possibleValues - predetermined values to choose from. needed for select and multiSelect, can be used in text filters
     * @param {Boolean} valIsArray - if the objects data is an object use this. the filter will check each property in the object (not recursive). if no match is found, the object will be hidden
     */
//    addSpellFilter(category, label, path, type, possibleValues = null, valIsArray = false) {
//        this.addFilter('spell', category, label, path, type, possibleValues, valIsArray);
//    }

    /**
     * Used to add custom filters to the NPC-Browser
     * @param {String} category - Title of the category
     * @param {String} label - Title of the filter
     * @param {String} path - path to the data that the filter uses. uses dotnotation. example: data.abilities.dex.value
     * @param {String} type - type of filter
     *                      possible filter:
     *                          text:           will give a textinput (or use a select if possibleValues has values) to compare with the data. will use objectData.indexOf(searchedText) to enable partial matching
     *                          bool:           will see if the data at the path exists and not false.
     *                          select:         exactly matches the data with the chosen selector from possibleValues
     *                          multiSelect:    enables selecting multiple values from possibleValues, any of witch has to match the objects data
     *                          numberCompare:  gives the option to compare numerical values, either with =, < or the > operator
     * @param {Boolean} possibleValues - predetermined values to choose from. needed for select and multiSelect, can be used in text filters
     * @param {Boolean} valIsArray - if the objects data is an object use this. the filter will check each property in the object (not recursive). if no match is found, the object will be hidden
     */
    addNpcFilter(category, label, path, type, possibleValues = null, valIsArray = false) {
        this.addFilter('npc', category, label, path, type, possibleValues, valIsArray);
    }
}

Hooks.on('ready', async function() {

    if (game.compendiumBrowser === undefined) {
        game.compendiumBrowser = new PowerBrowser();
        await game.compendiumBrowser.initializeContent();
    }
//
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("DND5E.Source"), 'data.source', 'text');
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.lvl"), 'data.level', 'multiSelect', [game.i18n.localize("CMPBrowser.cantip"), 1, 2, 3, 4, 5, 6, 7, 8, 9]);
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.school"), 'data.school', 'select', CONFIG.DND5E.spellSchools);
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.castingTime"), 'data.activation.type', 'select',
//        {
//            action: game.i18n.localize("DND5E.Action"),
//            bonus: game.i18n.localize("CMPBrowser.bonusAction"),
//            reaction: game.i18n.localize("CMPBrowser.reaction"),
//            minute: game.i18n.localize("DND5E.TimeMinute"),
//            hour: game.i18n.localize("DND5E.TimeHour"),
//            day: game.i18n.localize("DND5E.TimeDay")
//        });
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.spellType"), 'data.actionType', 'select', CONFIG.DND5E.itemActionTypes);
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.damageType"), 'damageTypes', 'select', CONFIG.DND5E.damageTypes);
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.class"), 'data.classes', 'select',
//        {
//            artificer: game.i18n.localize("CMPBrowser.artificer"),
//            bard: game.i18n.localize("CMPBrowser.bard"),
//            cleric: game.i18n.localize("CMPBrowser.cleric"),
//            druid: game.i18n.localize("CMPBrowser.druid"),
//            paladin: game.i18n.localize("CMPBrowser.paladin"),
//            ranger: game.i18n.localize("CMPBrowser.ranger"),
//            sorcerer: game.i18n.localize("CMPBrowser.sorcerer"),
//            warlock: game.i18n.localize("CMPBrowser.warlock"),
//            wizard: game.i18n.localize("CMPBrowser.wizard"),
//        }, true);
//
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.ritual"), 'data.components.ritual', 'bool');
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.concentration"), 'data.components.concentration', 'bool');
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.verbal"), 'data.components.vocal', 'bool');
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.somatic"), 'data.components.somatic', 'bool');
//    game.compendiumBrowser.addSpellFilter(game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.material"), 'data.components.material', 'bool');
//
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("DND5E.Source"), 'data.details.source', 'text');
	game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.size"), 'data.details.size.value', 'select', ACTORSIZES);
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.hasSpells"), 'hasSpells', 'bool');
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.hasLegAct"), 'data.resources.legact.max', 'bool');
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.hasLegRes"), 'data.resources.legres.max', 'bool');
    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.lvl"), 'data.details.level.value', 'numberCompare');
    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.creatureType"), 'data.details.type.value', 'text', {
        aberration: game.i18n.localize("CMPBrowser.aberration"),
        beast: game.i18n.localize("CMPBrowser.beast"),
        celestial: game.i18n.localize("CMPBrowser.celestial"),
        construct: game.i18n.localize("CMPBrowser.construct"),
        demon: game.i18n.localize("CMPBrowser.demon"),
        devil: game.i18n.localize("CMPBrowser.devil"),
        dragon: game.i18n.localize("CMPBrowser.dragon"),
        elemental: game.i18n.localize("CMPBrowser.elemental"),
        fey: game.i18n.localize("CMPBrowser.fey"),
        giant: game.i18n.localize("CMPBrowser.giant"),
        humanoid: game.i18n.localize("CMPBrowser.humanoid"),
        monstrosity: game.i18n.localize("CMPBrowser.monstrosity"),
        ooze: game.i18n.localize("CMPBrowser.ooze"),
        plant: game.i18n.localize("CMPBrowser.plant"),
        undead: game.i18n.localize("CMPBrowser.undead")
    });
//
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityStr"), 'data.abilities.str.value', 'numberCompare');
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityDex"), 'data.abilities.dex.value', 'numberCompare');
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityCon"), 'data.abilities.con.value', 'numberCompare');
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityInt"), 'data.abilities.int.value', 'numberCompare');
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityWis"), 'data.abilities.wis.value', 'numberCompare');
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityCha"), 'data.abilities.cha.value', 'numberCompare');
//
    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("CMPBrowser.PD"), 'data.attributes.pd.value', 'numberCompare');
    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("CMPBrowser.MD"), 'data.attributes.md.value', 'numberCompare');
    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("CMPBrowser.AC"), 'data.attributes.ac.value', 'numberCompare');
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("DND5E.ConImm"), 'data.traits.ci.value', 'multiSelect', CONFIG.DND5E.conditionTypes, true);
//    game.compendiumBrowser.addNpcFilter(game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("CMPBrowser.dmgDealt"), 'damageDealt', 'multiSelect', CONFIG.DND5E.damageTypes, true);
});
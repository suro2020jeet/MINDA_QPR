sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"com/minda/QPR/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/model/Sorter',
	'sap/m/MessageBox',
	"sap/ui/core/Element",
	"sap/m/MessageToast",
	"com/minda/QPR/model/formatter"
], function (JSONModel, Controller, Filter, FilterOperator, Sorter, MessageBox, Element, MessageToast, formatter) {
	"use strict";

	return Controller.extend("com.minda.QPR.controller.Master", {
		formatter: formatter,
		onInit: function () {
			// debugger;
			this.getOwnerComponent().setModel(new JSONModel({
				busy: false,
				plant: "1031",
				vendor: "0000200323",
				showAdvancedSearch: false
			}), "listViewModel");
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;
			if (!sap.ushell) {} else {
				if (sap.ui.getCore().plants != undefined) {
					if (sap.ui.getCore().plants.hasOwnProperty("plant")) {
						if (sap.ui.getCore().plants.plant) {
							this.getOwnerComponent().getModel("listViewModel").setProperty("/plant", sap.ui.getCore().plants.plant);
							this._getMasterListData();
						}
					}
					sap.ui.getCore().plants.registerListener(function (val) {
						if (val) {
							this.getOwnerComponent().getModel("listViewModel").setProperty("/plant", val);
							this._getMasterListData();
						}
					}.bind(this));
				}
			}
			// this._getUserDetails();
			// this._getMasterListData();
		},

		onListItemPress: function (oEvent) {
			oEvent.getParameter("listItem").setSelected(true);
			this.oRouter.navTo("detail", {
				QprNo: oEvent.getParameter("listItem").getBindingContext("qprModel").getObject().QprNo
			});
		},
		onSearch: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("newValue");
			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter("QprNo", FilterOperator.Contains, sQuery)];
			}
			this.getView().byId("table").getBinding("items").filter(oTableSearchState, "Application");
		},

		onSort: function (oEvent) {
			this._bDescendingSort = !this._bDescendingSort;
			var oView = this.getView(),
				oTable = oView.byId("table"),
				oBinding = oTable.getBinding("items"),
				oSorter = new Sorter("QprNo", this._bDescendingSort);
			oBinding.sort(oSorter);
		},
		onUpdateFinished: function (oEvent) {
			if (oEvent.getSource().getItems()[0] == undefined) {
				this.oRouter.navTo("404");
			} else {
				if (!this.getOwnerComponent().getModel("device").getProperty("/system/phone")) {
					oEvent.getSource().getItems()[0].setSelected(true);
					this.oRouter.navTo("detail", {
						QprNo: oEvent.getSource().getItems()[0].getBindingContext("qprModel").getObject().QprNo
					});
				}
			}
		},
		_applyFilter: function (oFilter) {
			var oTable = this.byId("table");
			oTable.getBinding("items").filter(oFilter);
		},

		handleFacetFilterReset: function (oEvent) {
			var oFacetFilter = Element.registry.get(oEvent.getParameter("id")),
				aFacetFilterLists = oFacetFilter.getLists();

			for (var i = 0; i < aFacetFilterLists.length; i++) {
				aFacetFilterLists[i].setSelectedKeys();
			}

			this._applyFilter([]);
		},

		handleListClose: function (oEvent) {
			// Get the Facet Filter lists and construct a (nested) filter for the binding
			var oFacetFilter = oEvent.getSource().getParent();

			this._filterModel(oFacetFilter);
		},

		handleConfirm: function (oEvent) {
			// Get the Facet Filter lists and construct a (nested) filter for the binding
			var oFacetFilter = oEvent.getSource();
			this._filterModel(oFacetFilter);
			MessageToast.show("confirm event fired");
		},

		_filterModel: function (oFacetFilter) {
			var mFacetFilterLists = oFacetFilter.getLists().filter(function (oList) {
				return oList.getSelectedItems().length;
			});

			if (mFacetFilterLists.length) {
				// Build the nested filter with ORs between the values of each group and
				// ANDs between each group
				var oFilter = new Filter(mFacetFilterLists.map(function (oList) {
					return new Filter(oList.getSelectedItems().map(function (oItem) {
						return new Filter(oList.getKey(), "EQ", oItem.getText());
					}), false);
				}), true);
				this._applyFilter(oFilter);
			} else {
				this._applyFilter([]);
			}
		},
		onChangePlant: function (oEvent) {
			debugger;
			this.getOwnerComponent().getModel("listViewModel").setProperty("/plant", oEvent.getSource().getSelectedItem().getKey());
			jQuery.ajax({
				type: "GET",
				contentType: "application/x-www-form-urlencoded",
				headers: {
					"Authorization": "Basic NDMyYjNjZjMtNGE1OS0zOWRiLWEwMWMtYzM5YzhjNGYyNTNkOjk2NTJmOTM0LTkwMmEtMzE1MS05OWNiLWVjZTE1MmJkZGQ1NA=="
				},
				url: "/token/accounts/c70391893/plant/vendors?plantId=" + oEvent.getSource().getSelectedItem().getKey(),
				dataType: "json",
				async: false,
				success: function (data, textStatus, jqXHR) {
					this.plants = data.plants;
					this.getOwnerComponent().setModel(new JSONModel(data), "vendorModel");
				}.bind(this),
				error: function (data) {
					// console.log("error", data);
				}
			});
		},
		onChangeVendor: function (oEvent) {
			this.getOwnerComponent().getModel("listViewModel").setProperty("/VendorId", oEvent.getSource().getSelectedItem().getKey());
		},
		onAdvancedSearchPress: function () {
			if (!this._oDialog) {
				this._oDialog = sap.ui.xmlfragment("com.minda.QPR.fragments.AdvancedSearch", this);
				this.getView().addDependent(this._oDialog);
			}
			this._oDialog.open();
		},
		onPressCloseDialog: function () {
			this._oDialog.close();
		},
		onPressApply: function () {
			this._oDialog.close();
			this._getMasterListData();
		}

	});

});
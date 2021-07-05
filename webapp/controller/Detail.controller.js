sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"com/minda/QPR/model/formatter",
	"sap/ui/core/Fragment",
	"sap/ui/unified/FileUploaderParameter"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, formatter, Fragment, FileUploaderParameter) {
	"use strict";

	return Controller.extend("com.minda.QPR.controller.Detail", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("detail").attachPatternMatched(this._onProductMatched, this);

		},
		// handleFullScreen: function () {
		// 	this.getView().getModel("detailViewModel").setProperty("/fullScreenButtonVisible", false);
		// 	this.getView().getModel("detailViewModel").setProperty("/exitFSButtonVisible", true);
		// 	this.getOwnerComponent().getModel("layout").setProperty("/layout", "MidColumnFullScreen");
		// },
		// exitFullScreen: function () {
		// 	this.getView().getModel("detailViewModel").setProperty("/exitFSButtonVisible", false);
		// 	this.getView().getModel("detailViewModel").setProperty("/fullScreenButtonVisible", true);
		// 	this.getOwnerComponent().getModel("layout").setProperty("/layout", "TwoColumnsMidExpanded");
		// },
		handleClose: function () {
			// this.getView().getModel("detailViewModel").setProperty("/exitFSButtonVisible", false);
			// this.getView().getModel("detailViewModel").setProperty("/fullScreenButtonVisible", true);
			// this.getOwnerComponent().getModel("layout").setProperty("/layout", "OneColumn");
			this.oRouter.navTo("master");
		},
		_onProductMatched: function (oEvent) {
			this._product = oEvent.getParameter("arguments").QprNo || this._product || "0";
			this.getView().setModel(new JSONModel({
				fullScreenButtonVisible: true,
				exitFSButtonVisible: false,
				busy: true,
				VendorCode: "0000200323",
				fileName: "",
				replyComment: ""
			}), "detailViewModel");
			this._getDetailViewData();

		},
		_getDetailViewData: function () {
			var filter = [];
			filter.push(new sap.ui.model.Filter("Vendor", sap.ui.model.FilterOperator.EQ, this.getOwnerComponent().getModel("listViewModel").getProperty(
				"/VendorId")));
			filter.push(new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, "1031"));
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				this.getOwnerComponent().getModel().read("/QprReportSet", {
					filters: filter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							if (this._product == oData.results[i].QprNo) {
								this.pdfUrl = "/sap/opu/odata/sap/ZGW_QPR_REPORT_SRV/QprReportPdfSet(Vendor='',QprNo='" + oData.results[i].QprNo +
									"',Plant='1031',MaterialCode='',QprCategory='')/$value";
									this.uploadUrl = "/sap/opu/odata/sap/ZGW_NOTIFICATION_ATTACHMENT_SRV/AttachmentSet(QprNo='" + oData.results[i].QprNo +
									"')/File";

								for (var key in oData.results[i]) {
									this.getView().getModel("detailViewModel").setProperty("/" + key, oData.results[i][key]);
								}
							}
						}
						this.getView().getModel("detailViewModel").setProperty("/busy", false);
						this.getView().getModel("detailViewModel").setProperty("/uploadURL", this.uploadUrl);
						this.getView().getModel("detailViewModel").setProperty("/pdfURL", this.pdfUrl);
					}.bind(this),
					error: function (oError) {

					}.bind(this)
				});

			}.bind(this));
		},
		onPressReply: function () {
			Fragment.load({
				name: "com.minda.QPR.fragments.ReplyDialog",
				controller: this
			}).then(function (oFragment) {
				this.getView().addDependent(oFragment);
				oFragment.open();
			}.bind(this));
		},
		onPressCloseDilog: function (oEvent) {
			oEvent.getSource().getParent().close();
		},
		onPressOKDilog: function (oEvent) {
			var oFileUploader = oEvent.getSource().getParent().getContent()[0].getContent()[2].getItems()[0];
			oFileUploader.removeAllHeaderParameters();
			this.getOwnerComponent().getModel("attachmentSRV").refreshSecurityToken();
			var csrfToken = this.getOwnerComponent().getModel("attachmentSRV").getHeaders()["x-csrf-token"];
			oFileUploader.insertHeaderParameter(new FileUploaderParameter({
				name: "x-csrf-token",
				value: csrfToken
			}));
			var oHeaderParameter = new sap.ui.unified.FileUploaderParameter({
				name: "slug",
				value: this.getView().getModel("detailViewModel").getProperty("/fileName") + "|application/pdf"
			});
			oFileUploader.insertHeaderParameter(oHeaderParameter);
			oFileUploader.upload();
			oEvent.getSource().getParent().close();
		},
		handleUploadComplete: function (oEvent) {
			var sResponse = oEvent.getParameter("response");
			oEvent.getSource().setValue("");
			if (oEvent.mParameters.status == 201) {
				var parser = new DOMParser();
				var xml = parser.parseFromString(oEvent.mParameters.responseRaw, "application/xml");
// 				var message = xml.getElementsByTagName("m:properties")[0].getElementsByTagName("d:Mesg")[0].textContent;
				sap.m.MessageBox.success("Message succesfully send...");
			} else {
				var parser = new DOMParser();
				var xml = parser.parseFromString(oEvent.mParameters.responseRaw, "application/xml");
				sap.m.MessageBox.error(xml.getElementsByTagName("message")[0].innerHTML);
			}
		},
		handleValueChange: function (oEvent) {
			oEvent.getParameter("newValue");
			this.getView().getModel("detailViewModel").setProperty("/fileName", oEvent.getParameter("newValue"));
		},
		onPressDownload: function(){
			sap.m.URLHelper.redirect(this.pdfUrl, true);
		}

	});

});
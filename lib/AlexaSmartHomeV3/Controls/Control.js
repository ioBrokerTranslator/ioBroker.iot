const AlexaResponse = require('../Alexa/AlexaResponse');
const Helpers = require('../Helpers/Utils');
const Logger = require('../Helpers/Logger');
/**
 *
 * @class
 */
class Control {
    /**
     * Represents the base functionality for a control in a smart device. A smart device has at least one control.
     * The specific functionality, natively supported capabilities etc. are defined in derived classes.
     * 
     * @constructor
     * @param detectedControl - The detected control in terms of iobroker type detector.
     */
    constructor(detectedControl) {
        const configuredMin = detectedControl?.object?.common?.min;
        const configuredMax = detectedControl?.object?.common?.max;
        this._valuesRangeMin = configuredMin === undefined || isNaN(configuredMin) ? 0 : configuredMin;
        this._valuesRangeMax = configuredMax === undefined || isNaN(configuredMax) ? 100 : configuredMax;

        this._supported = this.initCapabilities(detectedControl);
        this._enforced = this.initEnforcedCapabilities(detectedControl);
        this.log = new Logger(this);
        this.log.silly(`created instance`);
    }
    /**
     * This function maps a passed on control to an array of objects. Each object contains an Alexa capability the control natively supports
     * and a pre-configured StateProxy with iobroker state ids and value converters from Alexa to iobroker types and vice versa. 
     * @param {*} ctrl - a control in terms of iobroker type detector.
     * @returns Array of objects with natively supported Alexa capabilities and correspondingly configured instances of StateProxies
     */
    initCapabilities(ctrl) {
        return []
    }
    /**
     * This function maps a passed on control to an array of objects. Each object contains an Alexa capability the control can handle even
     * though not natively supported (e.g., the light control can handle the Alexa BrightnessController directive by switching
     * itself ON on brightness > 0 and OFF on brightness == 0)
     * and a pre-configured StateProxy with iobroker state ids and value converters from Alexa to iobroker types and vice versa. 
     * @param {*} ctrl - a control in terms of iobroker type detector.
     * @returns Array of objects with natively supported Alexa capabilities and correspondingly configured instances of StateProxies
     */
    initEnforcedCapabilities(ctrl) {
        return []
    }

    get allCapabillities() {
        return this.supported.concat(this.enforced)
    }


    get valuesRangeMin() {
        return this._valuesRangeMin
    }

    get valuesRangeMax() {
        return this._valuesRangeMax
    }

    static get type() {
        return 'base'
    }
    /**
     * Getter for Alexa categories
     */
    get categories() {
        return []
    }

    get name() {
        return `${this.constructor.name}`
    }
    /**
     * Getter for _supported
     */
    get supported() {
        return this._supported
    }
    /**
     * Getter for _enforced
     */
    get enforced() {
        return this._enforced
    }
    /**
     * This function returns whether the control natively supports the passed on Alexa directive.
     * @param {*} event - The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns {Boolean} - True if the control natively supports the directive, false - otherwise
     */
    supports(event) {
        return this.supported.find(item => item.capability.matches(event)) !== undefined
    }
    /**
     * This function returns whether the control though doesn't natively supports the passed on Alexa directive, but able to handle it. 
     * @param {*} event - The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns {Boolean} - True if the control can handle the directive, false - otherwise
     */
    canHandle(event) {
        return this.enforced.find(item => item.capability.matches(event)) !== undefined
    }
    /**
     * This function processes an Alexa directive. Usually the result of the processing is setting an iobroker state to some value
     * as a reaction to an interaction with Alexa via voice, app, etc.
     * @async 
     * @param {*} event - The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns {Promise<Object>} - Object containing the response to be sent to Alexa Service
     */
    async handle(event) {

        this.log.debug(`handling Alexa event`);
        this.log.silly(`${JSON.stringify(event)}`);

        const eventHandler = this.allCapabillities.find(item => item.capability.matches(event));
        if (eventHandler) {
            // extract alexa value from event
            const alexaValue = eventHandler.capability.alexaValue(event);
            // convert alexa value to iobroker value
            const value = eventHandler.stateProxy.value(alexaValue);
            try {
                // set iobroker state 
                await Helpers.setState(eventHandler.stateProxy.setId, value);
                eventHandler.stateProxy.currentValue = value;
            } catch (error) {
                this.log.error(`failed handling Alexa event`);
                this.log.debug(`${error}`);
                return Promise.reject(AlexaResponse.endpointUnreachable().get());
            }

            const response = AlexaResponse.handled(event, eventHandler.capability.propertyName, alexaValue);

            this.log.silly(`${JSON.stringify(response.get())}`)

            return response.get();
        }

        const errorResponse = AlexaResponse.directiveNotSupported(this.name, event?.directive?.header?.namespace);

        this.log.silly(`${JSON.stringify(errorResponse.get())}`)

        return Promise.reject(errorResponse.get());
    }

    async reportState() {

        this.log.debug(`reporting state`);

        let properties = [];
        for (const item of this.supported) {
            try {
                if (item.stateProxy.currentValue === undefined) {
                    item.stateProxy.currentValue = await Helpers.getState(item.stateProxy.getId);
                }
                properties.push({
                    namespace: item.capability.namespace,
                    name: item.capability.propertyName,
                    value: item.capability.reportValue(item.stateProxy.alexaValue(item.stateProxy.currentValue))
                })
            } catch (error) {
                this.log.error(`failed reporting state`);
                this.log.debug(`${error}`);
            }
        }

        this.log.silly(`${JSON.stringify(properties)}`);
        return properties;
    }

    toString() {
        return `${this.constructor.name}`
    }
}

module.exports = Control;
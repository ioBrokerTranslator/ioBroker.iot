const Capabilities = require('../Alexa/Capabilities');
const StateProxy = require('../Helpers/StateProxy');
const Control = require('./Control');
/**
 * @class
 */
class Light extends Control {

    static get type() {
        return 'light'
    }

    get categories() {
        return ['LIGHT']
    }

    initCapabilities(ctrl) {
        return [
            {
                capability: new Capabilities.PowerController(),
                stateProxy: this.stateProxy(ctrl, Capabilities.PowerController)
            }
        ]
    }

    initEnforcedCapabilities(ctrl) {
        return [
            {
                capability: new Capabilities.BrightnessController(),
                stateProxy: this.stateProxy(ctrl, Capabilities.BrightnessController)
            }
        ]
    }

    stateProxy(ctrl, capability) {
        /*
            Device of type 'light' can be switched 'ON' and 'OFF'. Usually the same address (iobroker state id) can be used 
            to obtain the current state of the control. 
        */
        // this state is a mandatory one for the control, so it exists
        let setPower = ctrl.states.find(item => item.name === 'SET');
        // this one is optional
        let getPower = ctrl.states.find(item => item.name === 'ON_ACTUAL');

        if (capability.name === Capabilities.PowerController.name) {

            return new StateProxy({
                setId: setPower.id,
                getId: getPower?.id,
                alexaSetter: function (alexaValue) {
                    return alexaValue === Capabilities.PowerController.ON
                },
                alexaGetter: function (value) {
                    return value ? Capabilities.PowerController.ON : Capabilities.PowerController.OFF
                }
            })
        }

        if (capability.name === Capabilities.BrightnessController.name) {
            return new StateProxy({
                setId: setPower.id,
                getId: getPower?.id,
                alexaSetter: function (alexaValue) {
                    return alexaValue > 0;
                },
                alexaGetter: function (value) {
                    return value ? 100 : 0;
                }
            })
        }
    }
}

module.exports = Light;